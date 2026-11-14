import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { SupportTicketServices } from "./supportTicket.service";

const createSupportTicket = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await SupportTicketServices.createSupportTicketInDB(
    userId,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Support ticket created successfully",
    data: result,
  });
});

const getAllSupportTickets = catchAsync(async (req, res) => {
  const result = await SupportTicketServices.getAllSupportTicketsFromDB(
    req.user,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support tickets retrieved successfully",
    meta: result.meta,
    stats: result.stats,
    data: result.data,
  });
});

const getSupportTicketStats = catchAsync(async (req, res) => {
  const result = await SupportTicketServices.getSupportTicketStatsFromDB(
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket statistics retrieved successfully",
    data: result,
  });
});

const getSupportTicketById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SupportTicketServices.getSupportTicketByIdFromDB(
    id,
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket retrieved successfully",
    data: result,
  });
});

const updateSupportTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SupportTicketServices.updateSupportTicketInDB(
    id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket updated successfully",
    data: result,
  });
});

const addReplyToTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const result = await SupportTicketServices.addReplyToTicketInDB(
    id,
    message,
    req.user,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reply sent successfully",
    data: result,
  });
});

const deleteSupportTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SupportTicketServices.deleteSupportTicketFromDB(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket closed and removed permanently",
    data: result,
  });
});

export const SupportTicketControllers = {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicketStats,
  getSupportTicketById,
  updateSupportTicket,
  addReplyToTicket,
  deleteSupportTicket,
};

