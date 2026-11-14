import mongoose, { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { Favorite } from "./favorite.model";

const assertValidObjectId = (id: string, label = "Reference") => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label} ID`);
  }
};

/**
 * Fast helper to check if a specific reference is favorited by a user.
 */
const isFavorite = async (
  userId?: string | Types.ObjectId,
  referenceId?: string | Types.ObjectId,
): Promise<boolean> => {
  if (!userId || !referenceId) {
    return false;
  }
  const exists = await Favorite.exists({
    userId: new Types.ObjectId(userId.toString()),
    referenceId: new Types.ObjectId(referenceId.toString()),
  });
  return Boolean(exists);
};

/**
 * Fast helper to get a Set of favorited IDs for batch listings (e.g. professionals list).
 */
const getFavoriteProfessionalIds = async (
  userId?: string | Types.ObjectId,
  professionalIds?: (string | Types.ObjectId)[],
): Promise<Set<string>> => {
  if (!userId || !professionalIds || !professionalIds.length) {
    return new Set<string>();
  }

  const validIds = professionalIds
    .map((id) => id?.toString())
    .filter((id): id is string =>
      Boolean(id && mongoose.Types.ObjectId.isValid(id)),
    )
    .map((id) => new Types.ObjectId(id));

  if (!validIds.length) {
    return new Set<string>();
  }

  const favorites = await Favorite.find({
    userId: new Types.ObjectId(userId.toString()),
    referenceId: { $in: validIds },
  })
    .select("referenceId")
    .lean();

  return new Set(favorites.map((fav) => fav.referenceId.toString()));
};

/**
 * Check favorite status for a single reference ID.
 */
const checkFavoriteStatus = async (userId: string, referenceId: string) => {
  assertValidObjectId(referenceId);
  const favorite = await Favorite.exists({
    userId: new Types.ObjectId(userId),
    referenceId: new Types.ObjectId(referenceId),
  });
  return { isFavorite: Boolean(favorite) };
};

/**
 * Toggle favorite: add if not favorited, remove if already favorited.
 */
const toggleFavorite = async (payload: {
  userId: string;
  referenceId: string;
}) => {
  const { userId, referenceId } = payload;
  assertValidObjectId(referenceId);

  if (userId.toString() === referenceId.toString()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot favorite your own profile",
    );
  }

  const targetUser = await User.findById(referenceId)
    .select("_id name role status")
    .lean();

  if (!targetUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target profile not found");
  }

  const existing = await Favorite.findOne({
    userId: new Types.ObjectId(userId),
    referenceId: new Types.ObjectId(referenceId),
  });

  if (existing) {
    await Favorite.deleteOne({ _id: existing._id });
    return {
      message: "Favorite removed successfully",
      isFavorite: false,
    };
  }

  const newFavorite = await Favorite.create({
    userId: new Types.ObjectId(userId),
    referenceId: new Types.ObjectId(referenceId),
  });

  return {
    message: "Favorite added successfully",
    isFavorite: true,
    data: newFavorite,
  };
};

/**
 * Retrieve all favorites for a user, fully formatted with professional details & review ratings.
 */
const getFavorites = async (userId: string) => {
  const favorites = await Favorite.find({
    userId: new Types.ObjectId(userId),
  })
    .populate({
      path: "referenceId",
      select:
        "_id name companyName profileImage verified city state zipCode streetAddress location about yearsOfExperience serviceRadiusInMiles businessHours acceptedPayments projectPhotos backgroundCheck tradeLicense liabilityInsurance category createdAt role",
      populate: {
        path: "category",
        select: "_id name icon coverImage",
      },
    })
    .populate({
      path: "userId",
      select: "_id name email role profileImage",
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!favorites.length) {
    return [];
  }

  // Filter out any favorites whose reference user has been deleted
  const validFavorites = favorites.filter((fav: any) =>
    Boolean(fav.referenceId),
  );

  const enrichedFavorites = await Promise.all(
    validFavorites.map(async (fav: any) => {
      const prof = fav.referenceId;
      const professionalId = prof._id?.toString();

      let reviewSummary = {
        averageRating: 0,
        totalReviews: 0,
      };

      if (professionalId) {
        const stats = await Review.calculateAverageRating(professionalId);
        reviewSummary = {
          averageRating: stats.averageRating,
          totalReviews: stats.totalReviews,
        };
      }

      const formattedProfessional = {
        _id: prof._id,
        name: prof.name,
        companyName: prof.companyName,
        profileImage: prof.profileImage,
        verified: prof.verified,
        isBackgroundVerified: Boolean(prof.backgroundCheck?.passed),
        isLicenseVerified: Boolean(prof.tradeLicense?.isVerified),
        isInsuranceVerified: Boolean(prof.liabilityInsurance?.isVerified),
        category: prof.category || null,
        city: prof.city || "",
        state: prof.state || "",
        zipCode: prof.zipCode || "",
        streetAddress: prof.streetAddress || "",
        location: prof.location || null,
        about: prof.about || "",
        yearsOfExperience: prof.yearsOfExperience || "",
        serviceRadiusInMiles: prof.serviceRadiusInMiles ?? null,
        businessHours: prof.businessHours || null,
        acceptedPayments: prof.acceptedPayments || [],
        projectPhotos: prof.projectPhotos || [],
        averageRating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        isFavorite: true,
        createdAt: prof.createdAt,
      };

      return {
        _id: fav._id,
        userId: fav.userId,
        referenceId: prof._id,
        professional: formattedProfessional,
        isFavorite: true,
        createdAt: fav.createdAt,
        updatedAt: fav.updatedAt,
      };
    }),
  );

  return enrichedFavorites;
};

/**
 * Retrieve a single favorite by favorite ID or reference ID.
 */
const getSingleFavorite = async (userId: string, id: string) => {
  assertValidObjectId(id);

  const query = mongoose.Types.ObjectId.isValid(id)
    ? {
        userId: new Types.ObjectId(userId),
        $or: [
          { _id: new Types.ObjectId(id) },
          { referenceId: new Types.ObjectId(id) },
        ],
      }
    : { _id: id, userId };

  const favorite = await Favorite.findOne(query)
    .populate({
      path: "referenceId",
      select:
        "_id name companyName profileImage verified city state zipCode streetAddress location about yearsOfExperience serviceRadiusInMiles businessHours acceptedPayments projectPhotos backgroundCheck tradeLicense liabilityInsurance category createdAt role",
      populate: {
        path: "category",
        select: "_id name icon coverImage",
      },
    })
    .lean();

  if (!favorite) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favorite not found");
  }

  const prof: any = favorite.referenceId;
  let reviewSummary = {
    averageRating: 0,
    totalReviews: 0,
  };

  if (prof?._id) {
    const stats = await Review.calculateAverageRating(prof._id.toString());
    reviewSummary = {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
    };
  }

  const formattedProfessional = prof
    ? {
        _id: prof._id,
        name: prof.name,
        companyName: prof.companyName,
        profileImage: prof.profileImage,
        verified: prof.verified,
        isBackgroundVerified: Boolean(prof.backgroundCheck?.passed),
        isLicenseVerified: Boolean(prof.tradeLicense?.isVerified),
        isInsuranceVerified: Boolean(prof.liabilityInsurance?.isVerified),
        category: prof.category || null,
        city: prof.city || "",
        state: prof.state || "",
        zipCode: prof.zipCode || "",
        streetAddress: prof.streetAddress || "",
        location: prof.location || null,
        about: prof.about || "",
        yearsOfExperience: prof.yearsOfExperience || "",
        serviceRadiusInMiles: prof.serviceRadiusInMiles ?? null,
        businessHours: prof.businessHours || null,
        acceptedPayments: prof.acceptedPayments || [],
        projectPhotos: prof.projectPhotos || [],
        averageRating: reviewSummary.averageRating,
        totalReviews: reviewSummary.totalReviews,
        isFavorite: true,
        createdAt: prof.createdAt,
      }
    : null;

  return {
    _id: favorite._id,
    userId: favorite.userId,
    referenceId: prof?._id || favorite.referenceId,
    professional: formattedProfessional,
    isFavorite: true,
    createdAt: favorite.createdAt,
    updatedAt: favorite.updatedAt,
  };
};

/**
 * Remove favorite by referenceId or favorite _id.
 */
const deleteFavorite = async (userId: string, id: string) => {
  assertValidObjectId(id);

  const query = {
    userId: new Types.ObjectId(userId),
    $or: [
      { _id: new Types.ObjectId(id) },
      { referenceId: new Types.ObjectId(id) },
    ],
  };

  const result = await Favorite.deleteOne(query);

  if (!result.deletedCount) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Favorite not found");
  }

  return {
    message: "Favorite removed successfully",
    isFavorite: false,
  };
};

export const FavoriteService = {
  isFavorite,
  getFavoriteProfessionalIds,
  checkFavoriteStatus,
  toggleFavorite,
  getFavorites,
  getSingleFavorite,
  deleteFavorite,
};
