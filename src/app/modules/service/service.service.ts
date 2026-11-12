import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { escapeRegex } from "../../../helpers/searchHelper";
import QueryBuilder from "../../builder/queryBuilder";
import { Category } from "../category/category.model";
import { IService } from "./service.interface";
import { Service } from "./service.model";

const assertValidObjectId = (id: string, label = "service") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label} ID`);
  }
};

const assertCategoryExists = async (categoryId: string) => {
  assertValidObjectId(categoryId, "category");

  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  }).lean();

  if (!category) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Selected category does not exist",
    );
  }

  return category;
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
  createServiceToDB,
  getMyServicesFromDB,
  getMyServiceByIdFromDB,
  updateMyServiceToDB,
  deleteMyServiceFromDB,
};
