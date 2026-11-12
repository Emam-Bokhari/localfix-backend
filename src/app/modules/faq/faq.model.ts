import { model, Schema } from "mongoose";
import { TFaq, FaqModel } from "./faq.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { USER_ROLES } from "../../../enums/user";
import { FAQ_ROLES } from "./faq.constant";

const faqSchema = new Schema<TFaq>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: FAQ_ROLES,
      default: USER_ROLES.HOME_OWNER,
      required: true,
      trim: true,
      lowercase: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

faqSchema.index({ role: 1, order: 1 });

faqSchema.plugin(softDeletePlugin);

export const Faq = model<TFaq, FaqModel>("Faq", faqSchema);
