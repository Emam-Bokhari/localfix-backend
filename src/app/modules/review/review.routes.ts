import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { ReviewValidation } from "./review.validation";
import { ReviewController } from "./review.controller";

const router = express.Router();

const allReviewRoles = [
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

router.post(
  "/",
  auth(USER_ROLES.HOME_OWNER),
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview,
);

router.get(
  "/my-reviews",
  auth(USER_ROLES.HOME_OWNER),
  ReviewController.getMyReviews,
);

router.get(
  "/contractor/:contractorId/summary",
  auth(...allReviewRoles),
  ReviewController.getContractorReviewSummary,
);

router.get(
  "/contractor/:contractorId",
  auth(...allReviewRoles),
  ReviewController.getContractorReviews,
);

router.get(
  "/maintenance/:maintenanceId",
  auth(...allReviewRoles),
  ReviewController.getReviewByMaintenanceId,
);

router.get(
  "/:id",
  auth(...allReviewRoles),
  ReviewController.getSingleReview,
);

export const ReviewRoutes = router;
