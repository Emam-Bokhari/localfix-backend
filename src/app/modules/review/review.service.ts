import mongoose, { Types } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { USER_ROLES } from "../../../enums/user";
import { User } from "../user/user.model";
import QueryBuilder from "../../builder/queryBuilder";
import { reviewSearchableFields } from "./review.constant";
import {
  TContractorReviewSummary,
  TCreateReviewPayload,
  TReview,
} from "./review.interface";
import { Review } from "./review.model";

const createReviewIntoDB = async (
  authUser: JwtPayload,
  payload: TCreateReviewPayload,
) => {
  if (authUser.role !== USER_ROLES.HOME_OWNER) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only homeowners can submit a review for a professional",
    );
  }

  const homeownerId = (authUser.userId || authUser.id)?.toString();
  if (!homeownerId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  if (
    !payload.contractor ||
    !mongoose.Types.ObjectId.isValid(payload.contractor)
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid professional ID");
  }

  if (
    !payload.maintenance ||
    !mongoose.Types.ObjectId.isValid(payload.maintenance)
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid job ID");
  }

  if (homeownerId === payload.contractor) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot review or rate yourself",
    );
  }

  const existingReview = await Review.findOne({
    maintenance: payload.maintenance,
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "A review has already been submitted for this job.",
    );
  }

  const reviewData: TReview = {
    contractor: new Types.ObjectId(payload.contractor),
    tenant: new Types.ObjectId(homeownerId),
    maintenance: new Types.ObjectId(payload.maintenance),
    rating: payload.rating,
    feedback: payload.feedback?.trim() || "",
  };

  const createdReview = await Review.create(reviewData);

  const populatedReview = await Review.findById(createdReview._id)
    .populate({
      path: "contractor",
      select: "name email profileImage phone",
    })
    .populate({
      path: "tenant",
      select: "name email profileImage phone",
    });

  return populatedReview || createdReview;
};

const getContractorReviewsFromDB = async (
  contractorId: string,
  query: Record<string, unknown>,
) => {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid professional ID");
  }

  const baseQuery = Review.find({
    contractor: new Types.ObjectId(contractorId),
  }).populate({
    path: "tenant",
    select: "name email profileImage phone",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(reviewSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [reviews, meta, summary] = await Promise.all([
    queryBuilder.modelQuery,
    queryBuilder.countTotal(),
    Review.calculateAverageRating(contractorId),
  ]);

  return {
    meta,
    summary,
    data: reviews,
  };
};

const getContractorReviewSummaryFromDB = async (
  contractorId: string,
): Promise<TContractorReviewSummary> => {
  if (!mongoose.Types.ObjectId.isValid(contractorId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid professional ID");
  }

  return await Review.calculateAverageRating(contractorId);
};

const getReviewByMaintenanceFromDB = async (maintenanceId: string) => {
  if (!mongoose.Types.ObjectId.isValid(maintenanceId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid job ID");
  }

  const review = await Review.findOne({
    maintenance: new Types.ObjectId(maintenanceId),
  })
    .populate({
      path: "contractor",
      select: "name email profileImage phone",
    })
    .populate({
      path: "tenant",
      select: "name email profileImage phone",
    });

  return review;
};

const getMyReviewsFromDB = async (
  authUser: JwtPayload,
  query: Record<string, unknown>,
) => {
  const homeownerId = (authUser.userId || authUser.id)?.toString();
  if (!homeownerId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const baseQuery = Review.find({
    tenant: new Types.ObjectId(homeownerId),
  }).populate({
    path: "contractor",
    select: "name email profileImage phone",
  });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(reviewSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [reviews, meta] = await Promise.all([
    queryBuilder.modelQuery,
    queryBuilder.countTotal(),
  ]);

  return {
    meta,
    data: reviews,
  };
};

const getSingleReviewFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid review ID");
  }

  const review = await Review.findById(id)
    .populate({
      path: "contractor",
      select: "name email profileImage phone",
    })
    .populate({
      path: "tenant",
      select: "name email profileImage phone",
    });

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found");
  }

  return review;
};

export const ReviewService = {
  createReviewIntoDB,
  getContractorReviewsFromDB,
  getContractorReviewSummaryFromDB,
  getReviewByMaintenanceFromDB,
  getMyReviewsFromDB,
  getSingleReviewFromDB,
};
