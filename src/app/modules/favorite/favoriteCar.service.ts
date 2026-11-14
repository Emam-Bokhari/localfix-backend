import mongoose, { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { FavoriteCar } from "./favoriteCar.model";
import { ReviewServices } from "../review/review.service";
import { REVIEW_TARGET_TYPE } from "../review/review.interface";
import { getCarTripCountMap } from "../car/car.utils";

const checkFavoriteCarStatus = async (userId: string, referenceId: string) => {
  const favorite = await FavoriteCar.findOne({ userId, referenceId });
  return { isFavorite: !!favorite };
};

const toggleFavorite = async (payload: {
  userId: string;
  referenceId: string;
}) => {
  const { userId, referenceId } = payload;

  const existing = await FavoriteCar.findOne({ userId, referenceId });

  if (existing) {
    await FavoriteCar.deleteOne({ _id: existing._id });
    return { message: "Favorite removed successfully", isFavorite: false };
  }

  const newFavorite = await FavoriteCar.create({
    userId,
    referenceId: new mongoose.Types.ObjectId(referenceId),
  });

  return {
    message: "Favorite added successfully",
    isFavorite: true,
    data: newFavorite,
  };
};

const getFavorite = async (userId: string) => {
  const favorites = await FavoriteCar.find({ userId })
    .populate({
      path: "referenceId", // Car model
    })
    .populate({
      path: "userId",
      select: "_id firstName email lastName role profileImage",
    })
    .lean();

  if (!favorites.length) return favorites;

  // ---------- STEP 1: Extract carIds ----------
  const carIds = favorites
    .map((fav: any) => fav.referenceId?._id)
    .filter(Boolean)
    .map((id: any) => new Types.ObjectId(id));

  // ---------- STEP 2: Get trip count map ----------
  const tripCountMap = await getCarTripCountMap(carIds);

  // ---------- STEP 3: Attach trips + rating ----------
  const finalFavorites = await Promise.all(
    favorites.map(async (fav: any) => {
      console.log(fav, "fav");
      const carId = fav.referenceId?._id?.toString();
      if (!carId) return fav;

      const hostId = fav.referenceId?.userId
        ? fav.referenceId.userId.toString()
        : null;

      let reviewSummary: any = null;

      if (hostId) {
        reviewSummary = await ReviewServices.getReviewSummary(
          hostId,
          REVIEW_TARGET_TYPE.HOST,
        );
      }

      return {
        ...fav,
        referenceId: {
          ...fav.referenceId,
          trips: tripCountMap[carId] || 0,
          averageRating: reviewSummary
            ? reviewSummary.averageRating
            : undefined,
          totalReviews: reviewSummary ? reviewSummary.totalReviews : undefined,
          starCounts: reviewSummary ? reviewSummary.starCounts : undefined,
          reviews: reviewSummary ? reviewSummary.reviews : undefined,
        },
      };
    }),
  );

  return finalFavorites;
};

const getSingleFavorite = async (userId: string, favoriteId: string) => {
  const favorite = await FavoriteCar.findOne({
    _id: favoriteId,
    userId,
  })
    .populate({
      path: "referenceId",
    })
    .lean();

  if (!favorite) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favorite not found");
  }

  return favorite;
};

const deleteFavorite = async (userId: string, referenceId: string) => {
  const result = await FavoriteCar.deleteOne({ userId, referenceId });

  if (!result.deletedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favorite not found");
  }

  return { message: "Favorite removed successfully" };
};

export const FavoriteCarServices = {
  toggleFavorite,
  checkFavoriteCarStatus,
  getFavorite,
  getSingleFavorite,
  deleteFavorite,
};
