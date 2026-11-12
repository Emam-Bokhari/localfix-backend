import { USER_ROLES } from "../../../enums/user";

export const faqSearchableFields = ["question", "answer"];

export const FAQ_ROLES = [
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
] as const;

export type TFaqRole = (typeof FAQ_ROLES)[number];

export const normalizeFaqRole = (
  role?: unknown,
): TFaqRole | string | undefined => {
  if (!role || typeof role !== "string") return undefined;
  const cleaned = role.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (
    cleaned === "home_owner" ||
    cleaned === "homeowner" ||
    cleaned === "homeowners" ||
    cleaned === "customer" ||
    cleaned === "customers" ||
    cleaned === "customer_faq" ||
    cleaned === "customer_faqs"
  )
    return USER_ROLES.HOME_OWNER;
  if (
    cleaned === "professional" ||
    cleaned === "professionals" ||
    cleaned === "pro" ||
    cleaned === "pros" ||
    cleaned === "contractor" ||
    cleaned === "contractors" ||
    cleaned === "pro_contractor" ||
    cleaned === "pro_contractors" ||
    cleaned === "pro_contractor_faq" ||
    cleaned === "pro_contractor_faqs"
  )
    return USER_ROLES.PROFESSIONAL;
  return cleaned;
};
