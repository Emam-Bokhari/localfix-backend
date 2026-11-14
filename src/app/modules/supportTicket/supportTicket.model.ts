import { model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import {
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
} from "./supportTicket.constant";
import {
  ISupportTicket,
  ISupportTicketDiscussion,
  SupportTicketModel,
} from "./supportTicket.interface";

const discussionMessageSchema = new Schema<ISupportTicketDiscussion>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const supportTicketSchema = new Schema<ISupportTicket, SupportTicketModel>(
  {
    ticketId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester ID is required"],
      index: true,
    },
    requesterName: {
      type: String,
      required: [true, "Requester name is required"],
      trim: true,
    },
    requesterEmail: {
      type: String,
      required: [true, "Requester email is required"],
      trim: true,
      lowercase: true,
    },
    requesterRole: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: [true, "Requester role is required"],
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(SUPPORT_TICKET_PRIORITY),
      default: SUPPORT_TICKET_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SUPPORT_TICKET_STATUS),
      default: SUPPORT_TICKET_STATUS.OPEN,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Detailed description is required"],
      trim: true,
    },
    relatedJobId: {
      type: String,
      trim: true,
      default: "",
    },
    assignedAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    discussion: {
      type: [discussionMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Auto-generate ticketId (e.g. TIK-1001, TIK-1002...) if not provided
supportTicketSchema.pre("validate", async function (next) {
  if (!this.ticketId) {
    try {
      const lastTicket = await (this.constructor as any)
        .findOne({}, { ticketId: 1 })
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
      this.ticketId = `TIK-${nextNumber}`;
    } catch (error: any) {
      return next(error);
    }
  }
  next();
});

supportTicketSchema.plugin(softDeletePlugin);

supportTicketSchema.index({ requester: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export const SupportTicket = model<ISupportTicket, SupportTicketModel>(
  "SupportTicket",
  supportTicketSchema,
);

