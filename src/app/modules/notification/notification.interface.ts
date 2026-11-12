import { ISoftDeleteModel } from "../../../types/softDelete";
import { Model, Types } from "mongoose";

export type INotification = {
  title: string;
  text: string;
  receiver?: Types.ObjectId | string;
  sender?: Types.ObjectId | string;
  read: boolean;
  referenceId?: Types.ObjectId | string;
  referenceModel?:
    | "User"
    | "Subscription"
    | "Package"
    | "Review"
    | "Support"
    | "Chat"
    | "Message"
    | "Category"
    | "Banner"
    | "Faq"
    | "Rule"
    | "Marquee"
    | "SiteSettings";
  type?: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
};

export type NotificationModel = ISoftDeleteModel<INotification>;
