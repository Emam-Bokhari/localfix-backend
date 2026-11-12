import { USER_ROLES } from "../../../enums/user";

export const faqSearchableFields = ["question", "answer"];

export const normalizeFaqRole = (
  role?: unknown,
): USER_ROLES | string | undefined => {
  if (!role || typeof role !== "string") return undefined;
  const cleaned = role.toLowerCase().trim();
  if (
    cleaned === "home_owner" ||
    cleaned === "homeowner" ||
    cleaned === "homeowners"
  )
    return USER_ROLES.HOME_OWNER;
  if (
    cleaned === "professional" ||
    cleaned === "professionals" ||
    cleaned === "pro" ||
    cleaned === "pros"
  )
    return USER_ROLES.PROFESSIONAL;
  if (cleaned === "admin" || cleaned === "admins") return USER_ROLES.ADMIN;
  if (
    cleaned === "super_admin" ||
    cleaned === "super_admins" ||
    cleaned === "superadmin"
  )
    return USER_ROLES.SUPER_ADMIN;
  return cleaned;
};
