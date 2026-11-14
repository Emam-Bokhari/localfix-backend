import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { CONTACT_US_PRIORITY, CONTACT_US_STATUS } from "./contactUs.constant";

export type TContactUs = {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: CONTACT_US_STATUS;
  priority?: CONTACT_US_PRIORITY;
};

export type ContactUsModel = ISoftDeleteModel<TContactUs>;
