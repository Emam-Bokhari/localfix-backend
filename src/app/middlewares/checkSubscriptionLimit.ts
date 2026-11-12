import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiErrors";
import { USER_ROLES } from "../../enums/user";
import { Subscription } from "../modules/subscription/subscription.model";

const verifyActiveSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active", "trialing"] },
  }).populate("packageId");

  if (!subscription) {
    throw new ApiError(
      StatusCodes.PAYMENT_REQUIRED,
      "You do not have an active subscription or free trial. Please subscribe to a plan.",
    );
  }

  if (
    subscription.status === "trialing" &&
    subscription.trialEndsAt &&
    new Date() > new Date(subscription.trialEndsAt)
  ) {
    throw new ApiError(
      StatusCodes.PAYMENT_REQUIRED,
      "Your free trial period has ended. Please upgrade your subscription.",
    );
  }

  if (!subscription.packageId) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Associated subscription package could not be found",
    );
  }
};

export const checkPropertyLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (
      user.role === USER_ROLES.ADMIN ||
      user.role === USER_ROLES.SUPER_ADMIN
    ) {
      return next();
    }
    await verifyActiveSubscription(user.id);
    next();
  } catch (error) {
    next(error);
  }
};

export const checkFlatLimit = checkPropertyLimit;
