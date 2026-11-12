import express from "express";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import validateRequest from "../../middlewares/validateRequest";
import { parseFileData } from "../../middlewares/parseFileData";
import {
  isAdmin,
  isAuthenticated,
  isSuperAdmin,
} from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";

const router = express.Router();

const userFileUpload = fileUploadHandler([
  "profileImage",
  "tradeLicense",
  "tradeLicenseCertificate",
  "coiCertificate",
  "insuranceCertificate",
]);

const userParseFiles = parseFileData(
  { fieldName: "profileImage", mode: "single" },
  { fieldName: "tradeLicense", mode: "single" },
  { fieldName: "tradeLicenseCertificate", mode: "single" },
  { fieldName: "coiCertificate", mode: "single" },
  { fieldName: "insuranceCertificate", mode: "single" },
);

/* ---------------------------- PROFILE ROUTES ---------------------------- */
router
  .route("/profile")
  .get(isAuthenticated, UserController.getMyProfile)
  .patch(
    isAuthenticated,
    userFileUpload,
    userParseFiles,
    validateRequest(UserValidation.updateProfileZodSchema),
    UserController.updateProfile,
  )
  .delete(isAuthenticated, UserController.deleteProfile);

/* ---------------------------- SUPER ADMIN ------------------------------- */
router.get("/super-admin", UserController.getSuperAdmin);

/* ---------------------------- ADMIN CREATE ------------------------------ */
router.post(
  "/create-admin",
  isSuperAdmin,
  validateRequest(UserValidation.createAdminZodSchema),
  UserController.createAdmin,
);

/* ---------------------------- ADMINS LIST ------------------------------- */
router.get("/admins", isSuperAdmin, UserController.getAdmin);
router.delete("/admins/:id", isSuperAdmin, UserController.deleteAdmin);

/* ---------------------------- USER CREATE & LIST ------------------------ */
router
  .route("/")
  .get(isAdmin, UserController.getUsers)
  .post(
    userFileUpload,
    userParseFiles,
    validateRequest(UserValidation.createUserZodSchema),
    UserController.createUser,
  )
  .patch(
    isAuthenticated,
    userFileUpload,
    userParseFiles,
    validateRequest(UserValidation.updateProfileZodSchema),
    UserController.updateProfile,
  );

/* ---------------------------- STATUS UPDATE ----------------------------- */
router.patch(
  "/admin/status/:id",
  isAdmin,
  UserController.updateAdminStatusById,
);
router.patch(
  "/status/:id",
  isAdmin,
  validateRequest(UserValidation.updateUserStatusZodSchema),
  UserController.updateUserStatusById,
);
router.patch(
  "/approval-status/:id",
  isAdmin,
  UserController.updateApprovalStatusById,
);

/* ---------------------------- DYNAMIC USER ID ROUTES (KEEP LAST!) ------- */
router
  .route("/:id")
  .get(isAdmin, UserController.getUserById)
  .delete(isAdmin, UserController.deleteUserById);

export const UserRoutes = router;
