import mongoose, { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { Category } from "../category/category.model";
import { User } from "../user/user.model";
import { IJobRequest, IServiceLocation } from "./jobRequest.interface";
import { JobRequest } from "./jobRequest.model";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { buildFuzzySearchRegex, escapeRegex } from "../../../helpers/searchHelper";
import { JOB_REQUEST_STATUS } from "../../../enums/jobRequest";

const isAdminRole = (role?: string) =>
  role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;

const assertValidObjectId = (id: string, entity = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${entity}`);
  }
};

const normalizeServiceLocation = (
  payload: Record<string, any>,
): IServiceLocation => {
  const existingLoc = payload.serviceLocation || {};
  return {
    zipCode: (existingLoc.zipCode || payload.zipCode || "").trim(),
    address: (existingLoc.address || payload.address || "").trim(),
    city: (existingLoc.city || payload.city || "").trim(),
    state: (existingLoc.state || payload.state || "").trim(),
    location: existingLoc.location,
  };
};

const createJobRequestToDB = async (
  userId: string,
  payload: Record<string, any>,
): Promise<IJobRequest> => {
  assertValidObjectId(payload.category, "Category ID");

  const categoryExists = await Category.findById(payload.category);
  if (!categoryExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  if (payload.professional) {
    assertValidObjectId(payload.professional, "Professional ID");
    const proUser = await User.findById(payload.professional);
    if (!proUser || proUser.role !== USER_ROLES.PROFESSIONAL) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Professional not found");
    }
  }

  const headline = (payload.headline || payload.title || "").trim();
  const title = (payload.title || payload.headline || "").trim();
  const serviceLocation = normalizeServiceLocation(payload);

  if (!serviceLocation.zipCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Service location ZIP code is required",
    );
  }

  const isUrgent =
    payload.isUrgent !== undefined
      ? Boolean(payload.isUrgent)
      : /urgent|asap|emergency/i.test(payload.timeframe || "");

  const jobRequestData: Partial<IJobRequest> = {
    ...payload,
    homeowner: new Types.ObjectId(userId),
    category: new Types.ObjectId(payload.category),
    professional: payload.professional
      ? new Types.ObjectId(payload.professional)
      : null,
    headline,
    title,
    serviceLocation,
    isUrgent,
    projectPhotos: Array.isArray(payload.projectPhotos)
      ? payload.projectPhotos
      : [],
    estimatedBudget:
      payload.estimatedBudget !== undefined && payload.estimatedBudget !== null
        ? Number(payload.estimatedBudget)
        : 0,
  };

  const createdJobRequest = await JobRequest.create(jobRequestData);

  // If a specific professional was targeted, notify them
  if (payload.professional) {
    try {
      await sendNotifications({
        receiver: payload.professional,
        sender: new Types.ObjectId(userId),
        title: "New Job Request",
        text: `You have received a new service request: "${headline}"`,
        type: NOTIFICATION_TYPE.PROFESSIONAL,
        referenceId: createdJobRequest._id,
        referenceModel: "JobRequest" as any,
      });
    } catch {
      // Notification errors should not block request creation
    }
  }

  const populated = await JobRequest.findById(createdJobRequest._id)
    .populate("category", "name icon coverImage")
    .populate("homeowner", "name email profileImage phone")
    .populate("professional", "name email profileImage phone companyName")
    .lean();

  return populated as unknown as IJobRequest;
};

const getMyJobRequestsFromDB = async (
  userId: string,
  userRole?: string,
  query: Record<string, unknown> = {},
) => {
  const normalizedQuery = { ...query };
  const baseFilter: Record<string, unknown> = {};

  if (!isAdminRole(userRole)) {
    baseFilter.homeowner = new Types.ObjectId(userId);
  } else if (normalizedQuery.homeowner) {
    baseFilter.homeowner = new Types.ObjectId(
      normalizedQuery.homeowner as string,
    );
    delete normalizedQuery.homeowner;
  }

  const searchableFields = [
    "headline",
    "title",
    "description",
    "serviceLocation.zipCode",
    "serviceLocation.city",
    "serviceLocation.address",
    "propertyType",
    "timeframe",
  ];

  const queryBuilder = new QueryBuilder(
    JobRequest.find(baseFilter)
      .populate("category", "name icon coverImage")
      .populate("professional", "name email profileImage phone companyName")
      .populate("homeowner", "name email profileImage phone"),
    normalizedQuery,
  )
    .search(searchableFields)
    .filter()
    .sort();

  queryBuilder.paginate();

  const [data, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  return { data, meta };
};

const getJobRequestByIdFromDB = async (
  id: string,
  userId: string,
  userRole?: string,
) => {
  assertValidObjectId(id, "Job Request ID");

  const jobRequest = await JobRequest.findById(id)
    .populate("category", "name icon coverImage")
    .populate(
      "homeowner",
      "name email profileImage phone city state zipCode streetAddress",
    )
    .populate(
      "professional",
      "name email profileImage phone companyName about yearsOfExperience",
    )
    .lean();

  if (!jobRequest) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Job request not found");
  }

  const homeownerId =
    (jobRequest.homeowner as { _id?: Types.ObjectId })?._id?.toString() ||
    jobRequest.homeowner?.toString();

  const professionalId =
    (jobRequest.professional as { _id?: Types.ObjectId })?._id?.toString() ||
    jobRequest.professional?.toString();

  const isOwner = homeownerId === userId;
  const isTargetedPro = professionalId === userId;
  const isAdmin = isAdminRole(userRole);
  const isOpenMarketplaceLead =
    !professionalId && userRole === USER_ROLES.PROFESSIONAL;

  if (!isOwner && !isTargetedPro && !isAdmin && !isOpenMarketplaceLead) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to view this job request",
    );
  }

  const rejectedBy = ((jobRequest as any).rejectedBy || []).map((u: any) =>
    u.toString(),
  );
  const isRejectedByMe = rejectedBy.includes(userId);

  return {
    ...jobRequest,
    isRejectedByMe,
  };
};

const updateJobRequestToDB = async (
  id: string,
  userId: string,
  userRole: string | undefined,
  payload: Record<string, any>,
) => {
  assertValidObjectId(id, "Job Request ID");

  const existing = await JobRequest.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Job request not found");
  }

  const isOwner = existing.homeowner.toString() === userId;
  if (!isOwner && !isAdminRole(userRole)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to update this job request",
    );
  }

  if (payload.category) {
    assertValidObjectId(payload.category, "Category ID");
    const categoryExists = await Category.findById(payload.category);
    if (!categoryExists) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
    }
  }

  if (payload.professional) {
    assertValidObjectId(payload.professional, "Professional ID");
    const proUser = await User.findById(payload.professional);
    if (!proUser || proUser.role !== USER_ROLES.PROFESSIONAL) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Professional not found");
    }
  }

  const updateData: Record<string, any> = { ...payload };

  if (payload.headline || payload.title) {
    const headline = payload.headline || payload.title;
    updateData.headline = headline;
    updateData.title = payload.title || headline;
  }

  if (payload.timeframe !== undefined || payload.isUrgent !== undefined) {
    updateData.isUrgent =
      payload.isUrgent !== undefined
        ? Boolean(payload.isUrgent)
        : /urgent|asap|emergency/i.test(
            payload.timeframe || existing.timeframe || "",
          );
  }

  if (
    payload.estimatedBudget !== undefined &&
    payload.estimatedBudget !== null
  ) {
    updateData.estimatedBudget = Number(payload.estimatedBudget);
  }

  if (
    payload.serviceLocation ||
    payload.zipCode ||
    payload.address ||
    payload.city ||
    payload.state
  ) {
    updateData.serviceLocation = {
      zipCode:
        payload.serviceLocation?.zipCode ||
        payload.zipCode ||
        existing.serviceLocation.zipCode,
      address:
        payload.serviceLocation?.address ??
        payload.address ??
        existing.serviceLocation.address,
      city:
        payload.serviceLocation?.city ??
        payload.city ??
        existing.serviceLocation.city,
      state:
        payload.serviceLocation?.state ??
        payload.state ??
        existing.serviceLocation.state,
      location:
        payload.serviceLocation?.location ?? existing.serviceLocation.location,
    };
  }

  const updated = await JobRequest.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("category", "name icon coverImage")
    .populate("homeowner", "name email profileImage phone")
    .populate("professional", "name email profileImage phone companyName")
    .lean();

  return updated;
};

const deleteJobRequestFromDB = async (
  id: string,
  userId: string,
  userRole?: string,
) => {
  assertValidObjectId(id, "Job Request ID");

  const existing = await JobRequest.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Job request not found");
  }

  const isOwner = existing.homeowner.toString() === userId;
  if (!isOwner && !isAdminRole(userRole)) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to delete this job request",
    );
  }

  const result = await JobRequest.softDeleteById(id);
  return result;
};

const getMarketplaceLeadsFromDB = async (
  userId: string,
  query: Record<string, unknown> = {},
) => {
  const normalizedQuery = { ...query };
  const proObjectId = new Types.ObjectId(userId);

  // Base filter for marketplace leads:
  // 1. Open request (no specific professional assigned)
  // 2. Not rejected by this professional
  // 3. Not soft-deleted
  const baseFilter: Record<string, any> = {
    professional: null,
    rejectedBy: { $ne: proObjectId },
    isDeleted: { $ne: true },
  };

  // Status filter (default to awaiting_quotes & quoted)
  if (normalizedQuery.status) {
    baseFilter.status = normalizedQuery.status;
    delete normalizedQuery.status;
  } else {
    baseFilter.status = {
      $in: [JOB_REQUEST_STATUS.AWAITING_QUOTES, JOB_REQUEST_STATUS.QUOTED],
    };
  }

  // Category filter
  const categoryParam = (
    normalizedQuery.category ||
    normalizedQuery.tradeCategory ||
    normalizedQuery.categoryId
  ) as string | undefined;

  delete normalizedQuery.category;
  delete normalizedQuery.tradeCategory;
  delete normalizedQuery.categoryId;

  if (
    categoryParam &&
    categoryParam !== "all" &&
    categoryParam.toLowerCase() !== "all trade categories"
  ) {
    if (mongoose.Types.ObjectId.isValid(categoryParam)) {
      baseFilter.category = new Types.ObjectId(categoryParam);
    } else {
      const matchedCat = await Category.findOne({
        name: {
          $regex: new RegExp(`^${escapeRegex(categoryParam.trim())}$`, "i"),
        },
      }).select("_id");

      if (matchedCat) {
        baseFilter.category = matchedCat._id;
      } else {
        baseFilter.category = new Types.ObjectId();
      }
    }
  }

  // Search filter
  const searchTerm = (
    normalizedQuery.searchTerm ||
    normalizedQuery.search ||
    normalizedQuery.q
  ) as string | undefined;

  delete normalizedQuery.searchTerm;
  delete normalizedQuery.search;
  delete normalizedQuery.q;

  if (searchTerm && searchTerm.trim()) {
    const trimmed = searchTerm.trim();
    const searchRegex =
      buildFuzzySearchRegex(trimmed) || new RegExp(escapeRegex(trimmed), "i");

    const [matchingHomeowners, matchingCategories] = await Promise.all([
      User.find({ name: searchRegex }).select("_id"),
      Category.find({ name: searchRegex }).select("_id"),
    ]);

    const matchingUserIds = matchingHomeowners.map((u) => u._id);
    const matchingCategoryIds = matchingCategories.map((c) => c._id);

    const searchConditions: Record<string, any>[] = [
      { headline: searchRegex },
      { title: searchRegex },
      { description: searchRegex },
      { "serviceLocation.city": searchRegex },
      { "serviceLocation.address": searchRegex },
      { "serviceLocation.zipCode": searchRegex },
      { "serviceLocation.state": searchRegex },
      { propertyType: searchRegex },
      { timeframe: searchRegex },
      { partsAndMaterials: searchRegex },
    ];

    if (matchingUserIds.length > 0) {
      searchConditions.push({ homeowner: { $in: matchingUserIds } });
    }

    if (matchingCategoryIds.length > 0) {
      searchConditions.push({ category: { $in: matchingCategoryIds } });
    }

    baseFilter.$or = searchConditions;
  }

  // Sort normalization ("Newest First", "Most Urgent", "Highest Budget")
  const rawSort = String(
    normalizedQuery.sort || normalizedQuery.sortBy || "",
  ).trim();
  delete normalizedQuery.sort;
  delete normalizedQuery.sortBy;

  let sortOption: Record<string, 1 | -1> | string = { createdAt: -1 };

  if (/urgent/i.test(rawSort)) {
    sortOption = { isUrgent: -1, createdAt: -1 };
  } else if (
    /budget/i.test(rawSort) ||
    rawSort === "highest_budget" ||
    rawSort === "-estimatedBudget"
  ) {
    sortOption = { estimatedBudget: -1, createdAt: -1 };
  } else if (
    /newest/i.test(rawSort) ||
    rawSort === "-createdAt" ||
    !rawSort
  ) {
    sortOption = { createdAt: -1 };
  } else {
    sortOption = rawSort.split(",").join(" ");
  }

  // Pagination
  const page = Math.max(1, Number(normalizedQuery.page) || 1);
  const limit = Math.max(1, Number(normalizedQuery.limit) || 10);
  const skip = (page - 1) * limit;

  delete normalizedQuery.page;
  delete normalizedQuery.limit;

  const finalFilter = { ...baseFilter, ...normalizedQuery };

  const [data, total] = await Promise.all([
    JobRequest.find(finalFilter)
      .populate("category", "name icon coverImage")
      .populate(
        "homeowner",
        "name email profileImage phone city state zipCode streetAddress",
      )
      .sort(sortOption as any)
      .skip(skip)
      .limit(limit)
      .lean(),
    JobRequest.countDocuments(finalFilter),
  ]);

  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data,
  };
};

const rejectMarketplaceLeadInDB = async (
  leadId: string,
  userId: string,
) => {
  assertValidObjectId(leadId, "Job Request ID");

  const existing = await JobRequest.findById(leadId);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Job request not found");
  }

  const proObjectId = new Types.ObjectId(userId);

  await JobRequest.findByIdAndUpdate(
    leadId,
    {
      $addToSet: { rejectedBy: proObjectId },
    },
    { new: true },
  );

  return {
    leadId,
    rejected: true,
  };
};

const getSingleMarketplaceLeadFromDB = async (
  id: string,
  userId: string,
) => {
  assertValidObjectId(id, "Job Request ID");

  const jobRequest = await JobRequest.findById(id)
    .populate("category", "name icon coverImage")
    .populate(
      "homeowner",
      "name email profileImage phone city state zipCode streetAddress",
    )
    .lean();

  if (!jobRequest) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Marketplace lead not found");
  }

  const professionalId =
    (jobRequest.professional as { _id?: Types.ObjectId })?._id?.toString() ||
    jobRequest.professional?.toString();

  // If this lead was directly assigned/targeted to someone else, reject access
  if (professionalId && professionalId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have permission to view this job request",
    );
  }

  const rejectedBy = ((jobRequest as any).rejectedBy || []).map((u: any) =>
    u.toString(),
  );
  const isRejectedByMe = rejectedBy.includes(userId);

  return {
    ...jobRequest,
    isRejectedByMe,
  };
};

export const JobRequestService = {
  createJobRequestToDB,
  getMyJobRequestsFromDB,
  getJobRequestByIdFromDB,
  updateJobRequestToDB,
  deleteJobRequestFromDB,
  getMarketplaceLeadsFromDB,
  getSingleMarketplaceLeadFromDB,
  rejectMarketplaceLeadInDB,
};
