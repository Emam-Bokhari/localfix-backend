import { Types } from "mongoose";
import { USER_ROLES } from "../../../enums/user";
import { ISoftDeleteModel } from "../../../types/softDelete";
import {
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "./supportTicket.constant";

export interface ISupportTicketDiscussion {
  _id?: Types.ObjectId;
  sender: Types.ObjectId;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt?: Date;
}

export interface ISupportTicket {
  ticketId: string;
  requester: Types.ObjectId;
  requesterName: string;
  requesterEmail: string;
  requesterRole: USER_ROLES;
  priority: SUPPORT_TICKET_PRIORITY;
  status: SUPPORT_TICKET_STATUS;
  subject: string;
  description: string;
  relatedJobId?: string;
  assignedAdmin?: Types.ObjectId | null;
  discussion: ISupportTicketDiscussion[];
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SupportTicketModel = ISoftDeleteModel<ISupportTicket>;

