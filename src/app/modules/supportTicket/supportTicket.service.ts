import { Types } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { USER_ROLES } from "../../../enums/user";
import QueryBuilder from "../../builder/queryBuilder";
import { User } from "../user/user.model";
import {
  SUPPORT_TICKET_SEARCHABLE_FIELDS,
  SUPPORT_TICKET_STATUS,
} from "./supportTicket.constant";
import { ISupportTicket } from "./supportTicket.interface";
import { SupportTicket } from "./supportTicket.model";

// Helper to find ticket by ObjectId or ticketId (e.g. TIK-1001)
const findTicketByIdOrCustomId = (idOrCustomId: string) => {
  const isObjectId = Types.ObjectId.isValid(idOrCustomId);
  const filter = isObjectId
    ? {
        $or: [
          { _id: new Types.ObjectId(idOrCustomId) },
          { ticketId: idOrCustomId.toUpperCase() },
        ],
      }
    : { ticketId: idOrCustomId.toUpperCase() };

  return SupportTicket.findOne(filter);
};

// 1. Create Support Ticket (Admin, Homeowner, Professional)
const createSupportTicketInDB = async (
  userId: string,
  payload: Partial<ISupportTicket>,
) => {
  const user = await User.isExistUserById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  payload.requester = new Types.ObjectId(userId);

  // Auto-fill requester details from authenticated user if not explicitly supplied
  if (!payload.requesterName) {
    payload.requesterName = user.name || "User";
  }

  if (!payload.requesterEmail) {
    payload.requesterEmail = user.email || "";
  }

  if (!payload.requesterRole) {
    payload.requesterRole = user.role as USER_ROLES;
  }

  // Generate sequential ticket ID (TIK-1001, TIK-1002...)
  const lastTicket = await SupportTicket.findOne({}, { ticketId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextNumber = 1001;
  if (lastTicket && lastTicket.ticketId) {
    const match = lastTicket.ticketId.match(/\d+/);
    if (match && match[0]) {
      const parsed = parseInt(match[0], 10);
      if (!isNaN(parsed)) {
        nextNumber = parsed + 1;
      }
    }
  }
  payload.ticketId = `TIK-${nextNumber}`;

  const createdTicket = await SupportTicket.create(payload);

  return createdTicket;
};

// 2. Get All Support Tickets (Admin sees all; Homeowner & Pro see only their own)
const getAllSupportTicketsFromDB = async (
  user: JwtPayload,
  query: Record<string, unknown>,
) => {
  const isAdminUser =
    user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;

  // Filter scoped to user if not admin
  if (!isAdminUser) {
    query.requester = user.id;
  }

  const baseQuery = SupportTicket.find()
    .populate({
      path: "requester",
      select: "_id firstName lastName name email phone role profileImage",
    })
    .populate({
      path: "assignedAdmin",
      select: "_id firstName lastName name email role profileImage",
    });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(SUPPORT_TICKET_SEARCHABLE_FIELDS)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  // Compute card statistics
  const statsFilter: Record<string, any> = isAdminUser
    ? {}
    : { requester: new Types.ObjectId(user.id) };

  const [totalTickets, openTickets, inProgressTickets, resolvedClosedTickets] =
    await Promise.all([
      SupportTicket.countDocuments({ ...statsFilter }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: SUPPORT_TICKET_STATUS.OPEN,
      }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: SUPPORT_TICKET_STATUS.IN_PROGRESS,
      }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: {
          $in: [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED],
        },
      }),
    ]);

  const stats = {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedClosedTickets,
  };

  return {
    data: data || [],
    meta,
    stats,
  };
};

// 3. Get Support Ticket Statistics (Admin cards)
const getSupportTicketStatsFromDB = async (user: JwtPayload) => {
  const isAdminUser =
    user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;

  const statsFilter: Record<string, any> = isAdminUser
    ? {}
    : { requester: new Types.ObjectId(user.id) };

  const [totalTickets, openTickets, inProgressTickets, resolvedClosedTickets] =
    await Promise.all([
      SupportTicket.countDocuments({ ...statsFilter }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: SUPPORT_TICKET_STATUS.OPEN,
      }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: SUPPORT_TICKET_STATUS.IN_PROGRESS,
      }),
      SupportTicket.countDocuments({
        ...statsFilter,
        status: {
          $in: [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED],
        },
      }),
    ]);

  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedClosedTickets,
  };
};

// 4. Get Support Ticket Details by ID or Custom ticketId (TIK-1001)
const getSupportTicketByIdFromDB = async (
  idOrCustomId: string,
  user: JwtPayload,
) => {
  const ticket = await findTicketByIdOrCustomId(idOrCustomId)
    .populate({
      path: "requester",
      select:
        "_id firstName lastName name email phone role profileImage professionalDetails",
    })
    .populate({
      path: "assignedAdmin",
      select: "_id firstName lastName name email role profileImage",
    })
    .populate({
      path: "discussion.sender",
      select: "_id firstName lastName name role profileImage",
    });

  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  const isAdminUser =
    user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;

  // Non-admins can only see their own tickets
  if (!isAdminUser) {
    const requesterId = (ticket.requester as any)?._id
      ? (ticket.requester as any)._id.toString()
      : ticket.requester.toString();

    if (requesterId !== user.id) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You do not have permission to view this support ticket",
      );
    }
  }

  return ticket;
};

// 5. Update Support Ticket (Admin only: status, priority, assignedAdmin, mark as resolved)
const updateSupportTicketInDB = async (
  idOrCustomId: string,
  payload: Partial<ISupportTicket>,
) => {
  const ticket = await findTicketByIdOrCustomId(idOrCustomId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  if (payload.status !== undefined) {
    ticket.status = payload.status;
  }

  if (payload.priority !== undefined) {
    ticket.priority = payload.priority;
  }

  if (payload.assignedAdmin !== undefined) {
    if (payload.assignedAdmin) {
      const adminUser = await User.isExistUserById(
        payload.assignedAdmin.toString(),
      );
      if (!adminUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Assigned admin not found");
      }
      ticket.assignedAdmin = new Types.ObjectId(payload.assignedAdmin);
    } else {
      ticket.assignedAdmin = null;
    }
  }

  await ticket.save();

  return getSupportTicketByIdFromDB(ticket._id.toString(), {
    id: "",
    role: USER_ROLES.ADMIN,
  });
};

// 6. Add Reply to Ticket Discussion (Admin or Ticket Requester)
const addReplyToTicketInDB = async (
  idOrCustomId: string,
  message: string,
  user: JwtPayload,
) => {
  const ticket = await findTicketByIdOrCustomId(idOrCustomId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  const isAdminUser =
    user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_ADMIN;

  const requesterId = (ticket.requester as any)?._id
    ? (ticket.requester as any)._id.toString()
    : ticket.requester.toString();

  // If not admin, verify ownership
  if (!isAdminUser && requesterId !== user.id) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to reply to this ticket",
    );
  }

  const senderUser = await User.isExistUserById(user.id);
  const senderName = senderUser?.name || "User";

  ticket.discussion.push({
    sender: new Types.ObjectId(user.id),
    senderName,
    senderRole: user.role,
    message,
    createdAt: new Date(),
  });

  // If ticket was open and an admin replies, transition status to in_progress
  if (isAdminUser && ticket.status === SUPPORT_TICKET_STATUS.OPEN) {
    ticket.status = SUPPORT_TICKET_STATUS.IN_PROGRESS;
  }

  await ticket.save();

  return getSupportTicketByIdFromDB(ticket._id.toString(), user);
};

// 7. Delete Ticket Permanently (Close ticket permanently - Admin only)
const deleteSupportTicketFromDB = async (idOrCustomId: string) => {
  const ticket = await findTicketByIdOrCustomId(idOrCustomId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  const deletedTicket = await SupportTicket.softDeleteById(
    ticket._id.toString(),
  );
  if (!deletedTicket) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to delete support ticket",
    );
  }

  return deletedTicket;
};

export const SupportTicketServices = {
  createSupportTicketInDB,
  getAllSupportTicketsFromDB,
  getSupportTicketStatsFromDB,
  getSupportTicketByIdFromDB,
  updateSupportTicketInDB,
  addReplyToTicketInDB,
  deleteSupportTicketFromDB,
};
