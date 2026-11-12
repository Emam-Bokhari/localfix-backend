import auth from "../app/middlewares/auth";
import { USER_ROLES } from "../enums/user";

export const isHomeOwner = auth(USER_ROLES.HOME_OWNER);

export const isProfessional = auth(USER_ROLES.PROFESSIONAL);

export const isHomeOwnerOrProfessional = auth(
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
);

export const isAdmin = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);

export const isSuperAdmin = auth(USER_ROLES.SUPER_ADMIN);

export const isAuthenticated = auth(
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
);
