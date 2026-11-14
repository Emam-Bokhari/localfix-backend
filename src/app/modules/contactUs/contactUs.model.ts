import { model, Schema } from "mongoose";
import { TContactUs, ContactUsModel } from "./contactUs.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { CONTACT_US_PRIORITY, CONTACT_US_STATUS } from "./contactUs.constant";

const contactUsSchema = new Schema<TContactUs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(CONTACT_US_STATUS),
      default: CONTACT_US_STATUS.PENDING,
    },
    priority: {
      type: String,
      enum: Object.values(CONTACT_US_PRIORITY),
      default: CONTACT_US_PRIORITY.LOW,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

contactUsSchema.plugin(softDeletePlugin);

export const ContactUs = model<TContactUs, ContactUsModel>(
  "ContactUs",
  contactUsSchema,
);
