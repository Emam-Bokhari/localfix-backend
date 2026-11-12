import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionValidation } from "./subscription.validation";

const router = express.Router();

const subscriptionRoles = [
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

router.post(
  "/checkout-session",
  auth(...subscriptionRoles),
  validateRequest(SubscriptionValidation.createCheckoutSessionZodSchema),
  SubscriptionController.createCheckoutSession,
);

router.post(
  "/customer-portal",
  auth(...subscriptionRoles),
  SubscriptionController.createCustomerPortalSession,
);

router.get(
  "/my-subscription",
  auth(...subscriptionRoles),
  SubscriptionController.getMySubscription,
);

router.post(
  "/cancel",
  auth(...subscriptionRoles),
  validateRequest(SubscriptionValidation.cancelSubscriptionZodSchema),
  SubscriptionController.cancelSubscription,
);

export const SubscriptionRoutes = router;
