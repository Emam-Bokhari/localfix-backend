import express from "express";
import { CheckrControllers } from "./checkr.controller";
import validateRequest from "../../middlewares/validateRequest";
import { CheckrValidation } from "./checkr.validation";
import { isAdmin, isProfessional } from "../../../helpers/authHelper";

const router = express.Router();

// Public Webhook route (authenticated cryptographically via x-checkr-signature)
router.post("/webhook", CheckrControllers.handleWebhook);

// Pre-signup screening link generator (for "Start on Checkr" before final submit)
router.post(
  "/start-screening",
  validateRequest(CheckrValidation.startScreeningZodSchema),
  CheckrControllers.startPreSignupScreening,
);

// Authenticated Professional routes
router.post(
  "/initiate",
  isProfessional,
  validateRequest(CheckrValidation.initiateBackgroundCheckZodSchema),
  CheckrControllers.initiateBackgroundCheck,
);

router.get(
  "/status",
  isProfessional,
  CheckrControllers.getMyBackgroundCheckStatus,
);

// Admin status check / sync route
router.get(
  "/status/:userId",
  isAdmin,
  CheckrControllers.getUserBackgroundCheckStatus,
);

export const CheckrRoutes = router;
