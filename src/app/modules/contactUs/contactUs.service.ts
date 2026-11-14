import { Types } from "mongoose";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { emailHelper } from "../../../helpers/emailHelper";
import { User } from "../user/user.model";
import { SiteSettings } from "../siteSettings/siteSettings.model";
import { TContactUs } from "./contactUs.interface";
import { ContactUs } from "./contactUs.model";
import QueryBuilder from "../../builder/queryBuilder";
import { emailTemplate } from "../../../shared/emailTemplate";

const submitContactUs = async (payload: TContactUs, userId?: string) => {
  if (userId) {
    const user = await User.isExistUserById(userId);
    if (user) {
      payload.userId = new Types.ObjectId(userId);
      if (!payload.name) {
        payload.name = user.name || "Unknown";
      }
      if (!payload.email) {
        payload.email = user.email || "Unknown";
      }
    }
  }

  const contactUsEntry = await ContactUs.create(payload);

  // Determine recipient email: config support_receiver_email, or SiteSettings supportEmail, or config email.user
  let receiverEmail = config.support_receiver_email;
  if (!receiverEmail) {
    try {
      const siteSettings = await SiteSettings.findOne();
      receiverEmail = siteSettings?.supportEmail;
    } catch {
      // ignore
    }
  }
  if (!receiverEmail) {
    receiverEmail = config.email.user;
  }

  if (receiverEmail) {
    try {
      const emailPayload = emailTemplate.contactUsNotification({
        to: receiverEmail,
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
      });

      await emailHelper.sendEmail(emailPayload);
    } catch (error) {
      console.error("Failed to send contact us notification email:", error);
    }
  }

  return contactUsEntry;
};

const getAllContactUsFromDB = async (query: any) => {
  const baseQuery = ContactUs.find().populate({
    path: "userId",
    select: "_id firstName lastName name email phone role profileImage",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["name", "email", "subject", "message"])
    .sort()
    .fields()
    .filter()
    .paginate();

  const [contactMessages, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  return {
    data: contactMessages || [],
    meta,
  };
};

const getContactUsByIdFromDB = async (id: string) => {
  const contact = await ContactUs.findById(id).populate({
    path: "userId",
    select: "firstName lastName name role profileImage email _id phone",
  });

  if (!contact) {
    throw new ApiError(404, "No contact message is found by this ID");
  }

  return contact;
};

const updateContactUsStatusInDB = async (
  id: string,
  payload: Partial<TContactUs>,
) => {
  const contact = await ContactUs.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!contact) {
    throw new ApiError(404, "No contact message is found by this ID");
  }

  return contact;
};

const deleteContactUsByIdFromDB = async (id: string) => {
  const contact = await ContactUs.softDeleteById(id);
  if (!contact) {
    throw new ApiError(400, "Failed to delete this contact message by this ID");
  }

  return contact;
};

export const ContactUsServices = {
  submitContactUs,
  getAllContactUsFromDB,
  getContactUsByIdFromDB,
  updateContactUsStatusInDB,
  deleteContactUsByIdFromDB,
};
