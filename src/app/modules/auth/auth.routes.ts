import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { USER_ROLES } from "../../../enums/user";

const router = express.Router();

const signupFileUpload = fileUploadHandler([
  "profileImage",
  "tradeLicense",
  "tradeLicenseCertificate",
  "coiCertificate",
  "insuranceCertificate",
]);

const signupParseFiles = parseFileData(
  { fieldName: "profileImage", mode: "single" },
  { fieldName: "tradeLicense", mode: "single" },
  { fieldName: "tradeLicenseCertificate", mode: "single" },
  { fieldName: "coiCertificate", mode: "single" },
  { fieldName: "insuranceCertificate", mode: "single" },
);

/* ---------------------------- SIGNUP / REGISTER ---------------------------- */
router.post(
  "/signup",
  signupFileUpload,
  signupParseFiles,
  validateRequest(AuthValidation.signUpZodSchema),
  AuthController.signUp,
);

router.post(
  "/register",
  signupFileUpload,
  signupParseFiles,
  validateRequest(AuthValidation.signUpZodSchema),
  AuthController.signUp,
);

/* ---------------------------- LOGIN ---------------------------------------- */
router.post(
  "/login",
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

/* ---------------------------- VERIFY EMAIL --------------------------------- */
router.post(
  "/verify-email",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, oneTimeCode } = req.body;

      req.body = { email, oneTimeCode: Number(oneTimeCode) };
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to convert string to number" });
    }
  },
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail,
);

/* ---------------------------- RESEND OTP ----------------------------------- */
router.post("/resend-otp", AuthController.resendVerificationEmail);

/* ---------------------------- PASSWORD MANAGEMENT -------------------------- */
router.post(
  "/forget-password",
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post(
  "/change-password",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.HOME_OWNER,
    USER_ROLES.PROFESSIONAL,
  ),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);

/* ---------------------------- TOKEN REFRESH -------------------------------- */
router.post("/refresh-token", AuthController.newAccessToken);

/* ---------------------------- DELETE ACCOUNT ------------------------------- */
router.delete(
  "/delete-account",
  auth(
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.HOME_OWNER,
    USER_ROLES.PROFESSIONAL,
  ),
  AuthController.deleteUser,
);

/* ---------------------------- SOCIAL LOGIN --------------------------------- */
router.post("/google-login", AuthController.googleLogin);

export const AuthRoutes = router;
