import { model, Schema, Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import {
  ReviewModel,
  TContractorReviewSummary,
  TReview,
} from "./review.interface";

const reviewSchema = new Schema<TReview, ReviewModel>(
  {
    contractor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Professional ID is required"],
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Homeowner ID is required"],
    },
    maintenance: {
      type: Schema.Types.ObjectId,
      ref: "Maintenance",
      required: [true, "Job ID is required"],
      unique: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: function (val: number) {
          return Number.isInteger(val) && val >= 1 && val <= 5;
        },
        message:
          "Rating must be an integer between 1 and 5. Float/decimal ratings are not allowed.",
      },
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reviewSchema.index({ maintenance: 1 }, { unique: true });
reviewSchema.index({ contractor: 1, createdAt: -1 });
reviewSchema.index({ tenant: 1 });

reviewSchema.pre("validate", function (next) {
  if (
    this.tenant &&
    this.contractor &&
    this.tenant.toString() === this.contractor.toString()
  ) {
    return next(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        "You cannot review or rate yourself",
      ),
    );
  }
  next();
});

reviewSchema.statics.calculateAverageRating = async function (
  contractorId: Types.ObjectId | string,
): Promise<TContractorReviewSummary> {
  const targetContractorId =
    typeof contractorId === "string"
      ? new Types.ObjectId(contractorId)
      : contractorId;

  const stats = await this.aggregate([
    {
      $match: {
        contractor: targetContractorId,
      },
    },
    {
      $group: {
        _id: "$contractor",
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
      },
    },
  ]);

  if (stats.length > 0) {
    const rawAverage = stats[0].averageRating ?? 0;
    return {
      contractor: targetContractorId,
      averageRating: parseFloat(rawAverage.toFixed(1)),
      totalReviews: stats[0].totalReviews,
      ratingDistribution: {
        5: stats[0].fiveStar,
        4: stats[0].fourStar,
        3: stats[0].threeStar,
        2: stats[0].twoStar,
        1: stats[0].oneStar,
      },
    };
  }

  return {
    contractor: targetContractorId,
    averageRating: 0.0,
    totalReviews: 0,
    ratingDistribution: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    },
  };
};

export const Review = model<TReview, ReviewModel>("Review", reviewSchema);
