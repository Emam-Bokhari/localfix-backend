import mongoose, { PipelineStage } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { APPROVAL_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { JOB_REQUEST_STATUS } from "../../../enums/jobRequest";
import ApiError from "../../../errors/ApiErrors";
import { escapeRegex } from "../../../helpers/searchHelper";
import { Category } from "../category/category.model";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { Service } from "../service/service.model";
import { JobRequest } from "../jobRequest/jobRequest.model";
import { FavoriteService } from "../favorite/favorite.service";
import {
  getBatchGoogleDistances,
  TDistanceResult,
} from "../../../helpers/googleMapsHelper";

const assertValidObjectId = (id: string, label = "professional") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label} ID`);
  }
};

const parseBudgetFilter = (
  query: Record<string, unknown>,
): { minBudget?: number; maxBudget?: number } => {
  let minBudget: number | undefined;
  let maxBudget: number | undefined;

  const rawMin = query.minBudget ?? query.minPrice;
  if (rawMin !== undefined && rawMin !== null && rawMin !== "") {
    const parsed = Number(rawMin);
    if (!isNaN(parsed)) minBudget = parsed;
  }

  const rawMax = query.maxBudget ?? query.maxPrice;
  if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
    const parsed = Number(rawMax);
    if (!isNaN(parsed)) maxBudget = parsed;
  }

  const rawBudget = query.budget as string | undefined;
  if (rawBudget && typeof rawBudget === "string") {
    const normalized = rawBudget.trim().toLowerCase();
    if (
      normalized === "under-85" ||
      normalized === "under_85" ||
      normalized === "under 85" ||
      normalized === "value" ||
      normalized === "<85" ||
      normalized === "<=85"
    ) {
      maxBudget = 85;
    } else if (
      normalized === "85-130" ||
      normalized === "85_130" ||
      normalized === "85 - 130" ||
      normalized === "mid-range" ||
      normalized === "mid_range"
    ) {
      minBudget = 85;
      maxBudget = 130;
    } else if (
      normalized === "above-130" ||
      normalized === "above_130" ||
      normalized === "above 130" ||
      normalized === "130-above" ||
      normalized === "130 & above" ||
      normalized === "high-end" ||
      normalized === "high_end" ||
      normalized === ">130" ||
      normalized === ">=130"
    ) {
      minBudget = 130;
    } else if (normalized.includes("-")) {
      const parts = normalized.split("-").map((p) => Number(p.trim()));
      if (!isNaN(parts[0])) minBudget = parts[0];
      if (parts[1] && !isNaN(parts[1])) maxBudget = parts[1];
    }
  }

  return { minBudget, maxBudget };
};

const computeTodayHours = (businessHours?: any) => {
  if (!businessHours) {
    return { isOpenToday: true, todayHours: "8:00 AM - 6:00 PM" };
  }

  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const todayName = daysOfWeek[new Date().getDay()];

  if (businessHours.mode === "customize" && businessHours.days) {
    const todayConfig = businessHours.days[todayName];
    if (todayConfig) {
      const isOpen = todayConfig.isOpen !== false;
      return {
        isOpenToday: isOpen,
        todayHours: isOpen
          ? `${todayConfig.openTime || "8:00 AM"} - ${todayConfig.closeTime || "6:00 PM"}`
          : "Closed",
      };
    }
  }

  const allDays = businessHours.allDays;
  const isOpen = allDays?.isOpen !== false;
  return {
    isOpenToday: isOpen,
    todayHours: isOpen
      ? `${allDays?.openTime || "8:00 AM"} - ${allDays?.closeTime || "6:00 PM"}`
      : "Closed",
  };
};

type TPopulatedCategory = {
  _id: mongoose.Types.ObjectId;
  name: string;
  icon?: string;
  coverImage?: string;
};

const buildCategoryTabs = (items: Array<{ category?: unknown }>) => {
  const categoryMap = new Map<string, TPopulatedCategory & { count: number }>();

  for (const item of items) {
    const cat = item.category as TPopulatedCategory | null | undefined;
    if (!cat || typeof cat !== "object" || !cat._id) {
      continue;
    }

    const key = cat._id.toString();
    const existing = categoryMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      categoryMap.set(key, {
        _id: cat._id,
        name: cat.name,
        icon: cat.icon,
        coverImage: cat.coverImage,
        count: 1,
      });
    }
  }

  return Array.from(categoryMap.values());
};

const getAllProfessionalsFromDB = async (
  query: Record<string, unknown> = {},
  currentUserId?: string,
) => {
  const rawCategoryId = (query.category || query.categoryId) as
    | string
    | undefined;
  const categoryParam = rawCategoryId?.trim();

  let targetCategoryId: mongoose.Types.ObjectId | null = null;
  if (
    categoryParam &&
    categoryParam.toLowerCase() !== "all" &&
    categoryParam.toLowerCase() !== "all services"
  ) {
    if (mongoose.Types.ObjectId.isValid(categoryParam)) {
      targetCategoryId = new mongoose.Types.ObjectId(categoryParam);
    } else {
      const matchedCategory = await Category.findOne({
        name: new RegExp(`^${escapeRegex(categoryParam)}$`, "i"),
        isDeleted: { $ne: true },
      }).lean();
      if (matchedCategory) {
        targetCategoryId = matchedCategory._id as mongoose.Types.ObjectId;
      }
    }
  }

  const searchTerm = (
    (query.searchTerm || query.search) as string | undefined
  )?.trim();
  const locationQuery = (
    (query.location || query.city || query.state || query.zipCode) as
      | string
      | undefined
  )?.trim();

  let userLat: number | undefined;
  let userLng: number | undefined;

  const rawLat = query.latitude ?? query.lat;
  const rawLng = query.longitude ?? query.lng;
  if (rawLat !== undefined && rawLat !== null && rawLat !== "") {
    const parsed = Number(rawLat);
    if (!isNaN(parsed)) userLat = parsed;
  }
  if (rawLng !== undefined && rawLng !== null && rawLng !== "") {
    const parsed = Number(rawLng);
    if (!isNaN(parsed)) userLng = parsed;
  }

  // If coordinates are not provided in query, retrieve from logged-in user's profile
  if ((userLat === undefined || userLng === undefined) && currentUserId) {
    const currentUser = await User.findById(currentUserId)
      .select("location")
      .lean();
    const userCoords = currentUser?.location?.coordinates;
    if (
      Array.isArray(userCoords) &&
      userCoords.length === 2 &&
      (userCoords[0] !== 0 || userCoords[1] !== 0)
    ) {
      userLng = userCoords[0];
      userLat = userCoords[1];
    }
  }

  const hasUserCoords =
    userLat !== undefined &&
    userLng !== undefined &&
    !isNaN(userLat) &&
    !isNaN(userLng);

  const radiusParam = query.radius ?? query.maxDistance;
  const maxDistanceInMiles =
    radiusParam !== undefined && radiusParam !== null && radiusParam !== ""
      ? Number(radiusParam)
      : undefined;

  const { minBudget, maxBudget } = parseBudgetFilter(query);

  const rawRating = query.minRating ?? query.rating;
  const minRating =
    rawRating !== undefined && rawRating !== null && rawRating !== ""
      ? Number(rawRating)
      : undefined;

  const sortBy = ((query.sortBy || query.sort) as string | undefined)
    ?.toLowerCase()
    .trim();

  // 1. Initial Match Stage for User
  const initialMatch: Record<string, unknown> = {
    role: USER_ROLES.PROFESSIONAL,
    status: STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
    isDeleted: { $ne: true },
  };

  if (locationQuery) {
    const locRegex = new RegExp(escapeRegex(locationQuery), "i");
    initialMatch.$or = [
      { city: locRegex },
      { state: locRegex },
      { zipCode: locRegex },
      { streetAddress: locRegex },
      { "location.address": locRegex },
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: initialMatch },
    // Lookup primary category from Category collection
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "primaryCategory",
      },
    },
    {
      $unwind: {
        path: "$primaryCategory",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup professional's services
    {
      $lookup: {
        from: "services",
        let: { proId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$professional", "$$proId"] },
              isDeleted: { $ne: true },
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryObj",
            },
          },
          {
            $unwind: {
              path: "$categoryObj",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              category: {
                $ifNull: ["$categoryObj", "$category"],
              },
            },
          },
        ],
        as: "services",
      },
    },
    // Lookup review ratings
    {
      $lookup: {
        from: "reviews",
        let: { proId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$contractor", "$$proId"] },
            },
          },
          {
            $group: {
              _id: "$contractor",
              totalReviews: { $sum: 1 },
              averageRating: { $avg: "$rating" },
            },
          },
        ],
        as: "reviewStats",
      },
    },
    // Lookup completed jobs from jobrequests
    {
      $lookup: {
        from: "jobrequests",
        let: { proId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$professional", "$$proId"] },
              status: JOB_REQUEST_STATUS.COMPLETED,
              isDeleted: { $ne: true },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "jobStats",
      },
    },
    // Add computed fields
    {
      $addFields: {
        averageRating: {
          $round: [
            {
              $ifNull: [{ $arrayElemAt: ["$reviewStats.averageRating", 0] }, 0],
            },
            1,
          ],
        },
        totalReviews: {
          $ifNull: [{ $arrayElemAt: ["$reviewStats.totalReviews", 0] }, 0],
        },
        effectiveRate: {
          $ifNull: ["$startingRate", 85],
        },
        actualCompletedJobs: {
          $ifNull: [{ $arrayElemAt: ["$jobStats.count", 0] }, 0],
        },
      },
    },
  ];

  // Category filter
  if (targetCategoryId) {
    pipeline.push({
      $match: {
        $or: [
          { "primaryCategory._id": targetCategoryId },
          { "services.category._id": targetCategoryId },
          { "services.category": targetCategoryId },
          { "projectPhotos.category": targetCategoryId },
        ],
      },
    });
  }

  // Search filter
  if (searchTerm) {
    const sRegex = new RegExp(escapeRegex(searchTerm), "i");
    pipeline.push({
      $match: {
        $or: [
          { name: sRegex },
          { companyName: sRegex },
          { about: sRegex },
          { "primaryCategory.name": sRegex },
          { "services.name": sRegex },
          { "services.description": sRegex },
        ],
      },
    });
  }

  // Budget filter
  const budgetMatch: Record<string, unknown> = {};
  if (minBudget !== undefined && !isNaN(minBudget)) {
    budgetMatch.$gte = minBudget;
  }
  if (maxBudget !== undefined && !isNaN(maxBudget)) {
    budgetMatch.$lte = maxBudget;
  }
  if (Object.keys(budgetMatch).length > 0) {
    pipeline.push({
      $match: { effectiveRate: budgetMatch },
    });
  }

  // Min rating filter
  if (minRating !== undefined && !isNaN(minRating)) {
    pipeline.push({
      $match: { averageRating: { $gte: minRating } },
    });
  }

  // Project fields
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      companyName: 1,
      profileImage: 1,
      verified: 1,
      isBackgroundVerified: { $ifNull: ["$backgroundCheck.passed", false] },
      isLicenseVerified: { $ifNull: ["$tradeLicense.isVerified", false] },
      isInsuranceVerified: {
        $ifNull: ["$liabilityInsurance.isVerified", false],
      },
      city: 1,
      state: 1,
      zipCode: 1,
      streetAddress: 1,
      location: 1,
      about: 1,
      yearsOfExperience: { $ifNull: ["$yearsOfExperience", "6-10 years"] },
      serviceRadiusInMiles: 1,
      businessHours: 1,
      acceptedPayments: 1,
      projectPhotos: 1,
      startingRate: "$effectiveRate",
      startingEstimate: "$effectiveRate",
      startingPrice: "$effectiveRate",
      hourlyRate: { $ifNull: ["$hourlyRate", "$effectiveRate"] },
      completedJobs: {
        $cond: {
          if: { $gt: ["$completedJobs", 0] },
          then: "$completedJobs",
          else: {
            $cond: {
              if: { $gt: ["$actualCompletedJobs", 0] },
              then: "$actualCompletedJobs",
              else: 74,
            },
          },
        },
      },
      localJobs: { $ifNull: ["$localJobs", 9] },
      responseTime: { $ifNull: ["$responseTime", "Replies in ~20 mins"] },
      availability: { $ifNull: ["$availability", "Available this week"] },
      averageRating: 1,
      totalReviews: 1,
      category: "$primaryCategory",
      serviceCount: { $size: "$services" },
      services: 1,
      createdAt: 1,
    },
  });

  // Sort stage
  let sortStage: Record<string, 1 | -1> = {
    averageRating: -1,
    totalReviews: -1,
    createdAt: -1,
  };
  if (
    sortBy === "highest_rated" ||
    sortBy === "rating" ||
    sortBy === "-rating"
  ) {
    sortStage = { averageRating: -1, totalReviews: -1, createdAt: -1 };
  } else if (
    sortBy === "most_reviewed" ||
    sortBy === "reviews" ||
    sortBy === "-reviews"
  ) {
    sortStage = { totalReviews: -1, averageRating: -1, createdAt: -1 };
  } else if (
    sortBy === "price_low_to_high" ||
    sortBy === "price_asc" ||
    sortBy === "budget_asc" ||
    sortBy === "low_to_high"
  ) {
    sortStage = { startingRate: 1, averageRating: -1, createdAt: -1 };
  } else if (
    sortBy === "price_high_to_low" ||
    sortBy === "price_desc" ||
    sortBy === "budget_desc" ||
    sortBy === "high_to_low"
  ) {
    sortStage = { startingRate: -1, averageRating: -1, createdAt: -1 };
  } else if (sortBy === "newest" || sortBy === "created_at") {
    sortStage = { createdAt: -1, _id: 1 };
  }

  pipeline.push({ $sort: sortStage });

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: "total" }],
    },
  });

  const [aggregateResult] = await User.aggregate(pipeline);
  const rawData = aggregateResult?.data || [];
  const total = aggregateResult?.totalCount?.[0]?.total || 0;
  const totalPage = Math.ceil(total / limit);

  // Compute favorite status
  const professionalIds = rawData.map((item: any) => item._id);
  const favoriteSet = currentUserId
    ? await FavoriteService.getFavoriteProfessionalIds(
        currentUserId,
        professionalIds,
      )
    : new Set<string>();

  // Calculate Google Maps Distance Matrix
  let distanceMap = new Map<string, TDistanceResult>();
  if (hasUserCoords) {
    const destinations = rawData
      .filter((item: any) => {
        const coords = item.location?.coordinates;
        return (
          Array.isArray(coords) &&
          coords.length === 2 &&
          (coords[0] !== 0 || coords[1] !== 0)
        );
      })
      .map((item: any) => ({
        id: item._id.toString(),
        lat: item.location.coordinates[1],
        lng: item.location.coordinates[0],
      }));

    if (destinations.length > 0) {
      distanceMap = await getBatchGoogleDistances(
        { lat: userLat!, lng: userLng! },
        destinations,
      );
    }
  }

  // Enrich data for UI cards
  let enrichedData = rawData.map((item: any) => {
    let distanceInMiles: number | null = null;
    let distanceFormatted: string | null = null;
    let durationFormatted: string | null = null;

    if (hasUserCoords) {
      const distInfo = distanceMap.get(item._id.toString());
      if (distInfo) {
        distanceInMiles = distInfo.distanceInMiles;
        distanceFormatted = distInfo.distanceFormatted;
        durationFormatted = distInfo.durationText || null;
      }
    }

    const coverImage =
      item.projectPhotos?.[0]?.image ||
      item.category?.coverImage ||
      item.profileImage ||
      "";

    const locationFormatted = `${item.city || ""}${
      item.city && item.state ? ", " : ""
    }${item.state || ""}`;

    return {
      ...item,
      coverImage,
      thumbnail: coverImage,
      locationFormatted,
      distanceInMiles,
      distanceFormatted,
      durationFormatted,
      hiredCount: item.completedJobs,
      totalJobs: item.completedJobs,
      isFavorite: favoriteSet.has(item._id.toString()),
    };
  });

  // Filter by distance radius if specified
  if (
    hasUserCoords &&
    maxDistanceInMiles !== undefined &&
    !isNaN(maxDistanceInMiles)
  ) {
    enrichedData = enrichedData.filter(
      (item: any) =>
        item.distanceInMiles !== null &&
        item.distanceInMiles <= maxDistanceInMiles,
    );
  }

  // If sort was distance
  if (sortBy === "distance" || sortBy === "nearest") {
    enrichedData.sort((a: any, b: any) => {
      const distA = a.distanceInMiles ?? Number.MAX_SAFE_INTEGER;
      const distB = b.distanceInMiles ?? Number.MAX_SAFE_INTEGER;
      return distA - distB;
    });
  }

  return {
    data: enrichedData,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

const getProfessionalDetailsFromDB = async (
  professionalId: string,
  currentUserId?: string,
) => {
  assertValidObjectId(professionalId, "professional");

  const professional = await User.findOne({
    _id: professionalId,
    role: USER_ROLES.PROFESSIONAL,
    status: STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
  })
    .select(
      "name companyName profileImage verified category about yearsOfExperience serviceRadiusInMiles city state zipCode streetAddress location timezone businessHours acceptedPayments projectPhotos backgroundCheck.passed tradeLicense.isVerified liabilityInsurance.isVerified startingRate hourlyRate completedJobs localJobs responseTime availability createdAt",
    )
    .populate("category", "name icon coverImage")
    .populate("projectPhotos.category", "name icon coverImage")
    .lean();

  if (!professional) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional not found");
  }

  const [services, reviewSummary, reviews, isFavorite, completedJobsCount] =
    await Promise.all([
      Service.find({ professional: professionalId, isDeleted: { $ne: true } })
        .populate("category", "name icon coverImage")
        .sort({ createdAt: -1 })
        .lean(),
      Review.calculateAverageRating(professionalId),
      Review.find({ contractor: professionalId })
        .populate({
          path: "tenant",
          select: "name profileImage city state",
        })
        .sort({ createdAt: -1 })
        .lean(),
      currentUserId
        ? FavoriteService.isFavorite(currentUserId, professionalId)
        : Promise.resolve(false),
      JobRequest.countDocuments({
        professional: professionalId,
        status: JOB_REQUEST_STATUS.COMPLETED,
        isDeleted: { $ne: true },
      }),
    ]);

  const projectPhotos = professional.projectPhotos || [];
  const hoursInfo = computeTodayHours(professional.businessHours);
  const startingRate = professional.startingRate || 85;
  const completedJobs =
    professional.completedJobs ||
    (completedJobsCount > 0 ? completedJobsCount : 74);
  const localJobs = professional.localJobs || 9;
  const coverImage =
    projectPhotos[0]?.image ||
    (professional.category as any)?.coverImage ||
    professional.profileImage ||
    "";
  const locationFormatted = `${professional.city || ""}${
    professional.city && professional.state ? ", " : ""
  }${professional.state || ""}`;

  // Calculate distance between current user and this professional via Google Maps
  let distanceInMiles: number | null = null;
  let distanceFormatted: string | null = null;
  let durationFormatted: string | null = null;

  if (currentUserId && professional.location?.coordinates) {
    const currentUser = await User.findById(currentUserId)
      .select("location")
      .lean();
    const userCoords = currentUser?.location?.coordinates;
    const proCoords = professional.location.coordinates;
    if (
      Array.isArray(userCoords) &&
      userCoords.length === 2 &&
      (userCoords[0] !== 0 || userCoords[1] !== 0) &&
      Array.isArray(proCoords) &&
      proCoords.length === 2 &&
      (proCoords[0] !== 0 || proCoords[1] !== 0)
    ) {
      const distMap = await getBatchGoogleDistances(
        { lat: userCoords[1], lng: userCoords[0] },
        [
          {
            id: professional._id.toString(),
            lat: proCoords[1],
            lng: proCoords[0],
          },
        ],
      );
      const distInfo = distMap.get(professional._id.toString());
      if (distInfo) {
        distanceInMiles = distInfo.distanceInMiles;
        distanceFormatted = distInfo.distanceFormatted;
        durationFormatted = distInfo.durationText || null;
      }
    }
  }

  return {
    _id: professional._id,
    name: professional.name,
    companyName: professional.companyName,
    profileImage: professional.profileImage,
    coverImage,
    thumbnail: coverImage,
    verified: professional.verified,
    isBackgroundVerified: Boolean(professional.backgroundCheck?.passed),
    isLicenseVerified: Boolean(professional.tradeLicense?.isVerified),
    isInsuranceVerified: Boolean(professional.liabilityInsurance?.isVerified),
    category: professional.category || null,
    about: professional.about || "",
    yearsOfExperience: professional.yearsOfExperience || "6-10 years",
    serviceRadiusInMiles: professional.serviceRadiusInMiles ?? null,
    city: professional.city || "",
    state: professional.state || "",
    zipCode: professional.zipCode || "",
    streetAddress: professional.streetAddress || "",
    location: professional.location || null,
    locationFormatted,
    distanceInMiles,
    distanceFormatted,
    durationFormatted,
    timezone: professional.timezone || "",
    businessHours: professional.businessHours || null,
    isOpenToday: hoursInfo.isOpenToday,
    todayHours: hoursInfo.todayHours,
    acceptedPayments: professional.acceptedPayments || [],
    startingRate,
    startingEstimate: startingRate,
    startingPrice: startingRate,
    hourlyRate: professional.hourlyRate || startingRate,
    completedJobs,
    hiredCount: completedJobs,
    localJobs,
    responseTime: professional.responseTime || "Replies in ~20 mins",
    availability: professional.availability || "Available this week",
    averageRating: reviewSummary.averageRating,
    totalReviews: reviewSummary.totalReviews,
    ratingDistribution: reviewSummary.ratingDistribution,
    serviceCount: services.length,
    services,
    photoCount: projectPhotos.length,
    categories: buildCategoryTabs([...services, ...projectPhotos]),
    projectPhotos,
    reviews,
    isFavorite,
    createdAt: professional.createdAt,
  };
};

export const ProfessionalService = {
  getAllProfessionalsFromDB,
  getProfessionalDetailsFromDB,
};
