import mongoose, { PipelineStage } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { APPROVAL_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { escapeRegex } from "../../../helpers/searchHelper";
import QueryBuilder from "../../builder/queryBuilder";
import { Category } from "../category/category.model";
import { Review } from "../review/review.model";
import { User } from "../user/user.model";
import { IService } from "./service.interface";
import { Service } from "./service.model";

const assertValidObjectId = (id: string, label = "service") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label} ID`);
  }
};

const assertCategoryExists = async (
  categoryId: string,
  requireActive = false,
) => {
  assertValidObjectId(categoryId, "category");

  const filter: Record<string, unknown> = {
    _id: categoryId,
    isDeleted: { $ne: true },
  };
  if (requireActive) {
    filter.isActive = true;
  }

  const category = await Category.findOne(filter).lean();

  if (!category) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Selected category does not exist",
    );
  }

  return category;
};

const getProfessionalsByCategoryFromDB = async (
  query: Record<string, unknown> = {},
) => {
  const rawCategoryId = (query.category || query.categoryId) as
    | string
    | undefined;
  const categoryId = rawCategoryId?.trim();

  const matchStage: Record<string, unknown> = {};
  if (categoryId) {
    await assertCategoryExists(categoryId, true);
    matchStage.category = new mongoose.Types.ObjectId(categoryId);
  }

  const pipeline: PipelineStage[] = [];
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$professional",
        serviceCount: { $sum: 1 },
        categoryIds: { $addToSet: "$category" },
        services: {
          $push: {
            _id: "$_id",
            name: "$name",
            category: "$category",
            description: "$description",
          },
        },
        latestServiceAt: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        let: { professionalId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$professionalId"] },
              role: USER_ROLES.PROFESSIONAL,
              status: STATUS.ACTIVE,
              approvalStatus: { $eq: APPROVAL_STATUS.APPROVED },
              isDeleted: { $ne: true },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              companyName: 1,
              profileImage: 1,
              verified: 1,
              city: 1,
              state: 1,
              zipCode: 1,
              streetAddress: 1,
              location: 1,
              about: 1,
              yearsOfExperience: 1,
              serviceRadiusInMiles: 1,
              businessHours: 1,
              acceptedPayments: 1,
              projectPhotos: 1,
              isBackgroundVerified: {
                $ifNull: ["$backgroundCheck.passed", false],
              },
              isLicenseVerified: {
                $ifNull: ["$tradeLicense.isVerified", false],
              },
              isInsuranceVerified: {
                $ifNull: ["$liabilityInsurance.isVerified", false],
              },
            },
          },
        ],
        as: "professional",
      },
    },
    { $unwind: "$professional" },
    {
      $lookup: {
        from: "categories",
        let: { categoryIds: "$categoryIds" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$_id", "$$categoryIds"] },
              isDeleted: { $ne: true },
              isActive: true,
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              coverImage: 1,
              icon: 1,
            },
          },
        ],
        as: "categories",
      },
    },
    { $match: { "categories.0": { $exists: true } } },
    {
      $lookup: {
        from: "reviews",
        let: { professionalId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$contractor", "$$professionalId"] },
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
    {
      $addFields: {
        reviewSummary: { $arrayElemAt: ["$reviewStats", 0] },
      },
    },
    {
      $project: {
        _id: "$professional._id",
        name: "$professional.name",
        companyName: "$professional.companyName",
        profileImage: "$professional.profileImage",
        verified: "$professional.verified",
        isBackgroundVerified: "$professional.isBackgroundVerified",
        isLicenseVerified: "$professional.isLicenseVerified",
        isInsuranceVerified: "$professional.isInsuranceVerified",
        city: "$professional.city",
        state: "$professional.state",
        zipCode: "$professional.zipCode",
        streetAddress: "$professional.streetAddress",
        location: "$professional.location",
        about: "$professional.about",
        yearsOfExperience: "$professional.yearsOfExperience",
        serviceRadiusInMiles: "$professional.serviceRadiusInMiles",
        businessHours: "$professional.businessHours",
        acceptedPayments: "$professional.acceptedPayments",
        projectPhotos: "$professional.projectPhotos",
        averageRating: {
          $round: [{ $ifNull: ["$reviewSummary.averageRating", 0] }, 1],
        },
        totalReviews: { $ifNull: ["$reviewSummary.totalReviews", 0] },
        serviceCount: 1,
        categories: 1,
        services: 1,
        latestServiceAt: 1,
      },
    },
    { $sort: { latestServiceAt: -1, _id: 1 } },
  );

  if (query.page || query.limit) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: { latestServiceAt: 0 } },
        ],
        totalCount: [{ $count: "total" }],
      },
    });

    const [result] = await Service.aggregate(pipeline);
    const data = result?.data || [];
    const total = result?.totalCount?.[0]?.total || 0;
    const totalPage = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPage,
      },
    };
  }

  pipeline.push({ $project: { latestServiceAt: 0 } });
  const data = await Service.aggregate(pipeline);
  return { data };
};

type TPopulatedCategory = {
  _id: mongoose.Types.ObjectId;
  name: string;
  icon?: string;
  coverImage?: string;
};

const buildCategoryTabs = (items: Array<{ category?: unknown }>) => {
  const categoryMap = new Map<
    string,
    TPopulatedCategory & { count: number }
  >();

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

const getProfessionalDetailsFromDB = async (professionalId: string) => {
  assertValidObjectId(professionalId, "professional");

  const professional = await User.findOne({
    _id: professionalId,
    role: USER_ROLES.PROFESSIONAL,
    status: STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
  })
    .select(
      "name companyName profileImage verified category about yearsOfExperience serviceRadiusInMiles city state zipCode streetAddress location timezone businessHours acceptedPayments projectPhotos backgroundCheck.passed tradeLicense.isVerified liabilityInsurance.isVerified createdAt",
    )
    .populate("category", "name icon coverImage")
    .populate("projectPhotos.category", "name icon coverImage")
    .lean();

  if (!professional) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Professional not found");
  }

  const [services, reviewSummary, reviews] = await Promise.all([
    Service.find({ professional: professionalId })
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
  ]);

  const projectPhotos = professional.projectPhotos || [];

  return {
    _id: professional._id,
    name: professional.name,
    companyName: professional.companyName,
    profileImage: professional.profileImage,
    verified: professional.verified,
    isBackgroundVerified: Boolean(professional.backgroundCheck?.passed),
    isLicenseVerified: Boolean(professional.tradeLicense?.isVerified),
    isInsuranceVerified: Boolean(professional.liabilityInsurance?.isVerified),
    category: professional.category || null,
    about: professional.about || "",
    yearsOfExperience: professional.yearsOfExperience || "",
    serviceRadiusInMiles: professional.serviceRadiusInMiles ?? null,
    city: professional.city || "",
    state: professional.state || "",
    zipCode: professional.zipCode || "",
    streetAddress: professional.streetAddress || "",
    location: professional.location || null,
    timezone: professional.timezone || "",
    businessHours: professional.businessHours || null,
    acceptedPayments: professional.acceptedPayments || [],
    averageRating: reviewSummary.averageRating,
    totalReviews: reviewSummary.totalReviews,
    ratingDistribution: reviewSummary.ratingDistribution,
    serviceCount: services.length,
    serviceCategories: buildCategoryTabs(services),
    services,
    photoCount: projectPhotos.length,
    photoCategories: buildCategoryTabs(projectPhotos),
    projectPhotos,
    reviews,
    createdAt: professional.createdAt,
  };
};

const createServiceToDB = async (
  professionalId: string,
  payload: { name: string; category: string; description: string },
): Promise<IService> => {
  const trimmedName = payload.name.trim();
  const categoryId = payload.category.trim();
  const trimmedDescription = payload.description.trim();

  await assertCategoryExists(categoryId);

  const existing = await Service.findOne({
    professional: professionalId,
    name: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
  });
  if (existing) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "You already have a service with this name",
    );
  }

  const created = await Service.create({
    professional: professionalId,
    name: trimmedName,
    category: categoryId,
    description: trimmedDescription,
  });

  return await created.populate("category", "name icon coverImage");
};

const getMyServicesFromDB = async (
  professionalId: string,
  query: Record<string, unknown> = {},
) => {
  const normalizedQuery = { ...query };
  if (normalizedQuery.search && !normalizedQuery.searchTerm) {
    normalizedQuery.searchTerm = normalizedQuery.search;
    delete normalizedQuery.search;
  }

  const queryBuilder = new QueryBuilder(
    Service.find({ professional: professionalId }).populate(
      "category",
      "name icon coverImage",
    ),
    normalizedQuery,
  )
    .search(["name", "description"])
    .filter()
    .sort();

  if (normalizedQuery.page || normalizedQuery.limit) {
    queryBuilder.paginate();
    const [data, meta] = await Promise.all([
      queryBuilder.modelQuery.lean(),
      queryBuilder.countTotal(),
    ]);
    return { data, meta };
  }

  const data = await queryBuilder.modelQuery.lean();
  return { data };
};

const getMyServiceByIdFromDB = async (professionalId: string, id: string) => {
  assertValidObjectId(id);

  const service = await Service.findOne({
    _id: id,
    professional: professionalId,
  })
    .populate("category", "name icon coverImage")
    .lean();

  if (!service) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
  }

  return service;
};

const updateMyServiceToDB = async (
  professionalId: string,
  id: string,
  payload: Partial<{ name: string; category: string; description: string }>,
) => {
  assertValidObjectId(id);

  const existing = await Service.findOne({
    _id: id,
    professional: professionalId,
  });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
  }

  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const trimmedName = payload.name.trim();
    const duplicate = await Service.findOne({
      _id: { $ne: id },
      professional: professionalId,
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
    });
    if (duplicate) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "You already have a service with this name",
      );
    }
    updateData.name = trimmedName;
  }

  if (payload.category !== undefined) {
    const categoryId = payload.category.trim();
    await assertCategoryExists(categoryId);
    updateData.category = categoryId;
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description.trim();
  }

  const updated = await Service.findOneAndUpdate(
    { _id: id, professional: professionalId },
    updateData,
    {
      new: true,
      runValidators: true,
    },
  ).populate("category", "name icon coverImage");

  return updated;
};

const deleteMyServiceFromDB = async (professionalId: string, id: string) => {
  assertValidObjectId(id);

  const existing = await Service.findOne({
    _id: id,
    professional: professionalId,
  });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service not found");
  }

  const result = await Service.softDeleteById(id);
  return result;
};

export const ServiceService = {
  getProfessionalsByCategoryFromDB,
  getProfessionalDetailsFromDB,
  createServiceToDB,
  getMyServicesFromDB,
  getMyServiceByIdFromDB,
  updateMyServiceToDB,
  deleteMyServiceFromDB,
};
