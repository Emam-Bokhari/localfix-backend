import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import { escapeRegex } from "../../../helpers/searchHelper";
import unlinkFile from "../../../shared/unlinkFile";
import QueryBuilder from "../../builder/queryBuilder";
import { ICategory } from "./category.interface";
import { Category } from "./category.model";

const isAdminRole = (role?: string) =>
  role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;

const cleanupFiles = (payload: Partial<ICategory>) => {
  if (payload.coverImage) unlinkFile(payload.coverImage);
  if (payload.icon) unlinkFile(payload.icon);
};

const assertValidObjectId = (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid category ID");
  }
};

const createCategoryToDB = async (
  payload: Partial<ICategory>,
): Promise<ICategory> => {
  const trimmedName = payload.name?.trim();
  if (!trimmedName) {
    cleanupFiles(payload);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category name is required");
  }

  const existing = await Category.findOne({
    name: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
  });
  if (existing) {
    cleanupFiles(payload);
    throw new ApiError(StatusCodes.CONFLICT, "Category already exists");
  }

  return await Category.create({ ...payload, name: trimmedName });
};

const getAllCategoriesFromDB = async (
  query: Record<string, unknown> = {},
  userRole?: string,
) => {
  const normalizedQuery = { ...query };
  const baseFilter: Record<string, unknown> = {};

  if (!isAdminRole(userRole)) {
    baseFilter.isActive = true;
    delete normalizedQuery.isActive;
  }

  const queryBuilder = new QueryBuilder(
    Category.find(baseFilter),
    normalizedQuery,
  )
    .search(["name"])
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

const getCategoryByIdFromDB = async (id: string, userRole?: string) => {
  assertValidObjectId(id);

  const category = await Category.findById(id).lean();
  if (!category || (!isAdminRole(userRole) && !category.isActive)) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategoryToDB = async (id: string, payload: Partial<ICategory>) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    cleanupFiles(payload);
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid category ID");
  }

  const existing = await Category.findById(id);
  if (!existing) {
    cleanupFiles(payload);
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  if (payload.name) {
    const trimmedName = payload.name.trim();
    const duplicate = await Category.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${escapeRegex(trimmedName)}$`, "i"),
    });
    if (duplicate) {
      cleanupFiles(payload);
      throw new ApiError(StatusCodes.CONFLICT, "Category already exists");
    }
    payload.name = trimmedName;
  }

  if (payload.coverImage && existing.coverImage) {
    unlinkFile(existing.coverImage);
  }
  if (payload.icon && existing.icon) {
    unlinkFile(existing.icon);
  }

  const updated = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return updated;
};

const deleteCategoryFromDB = async (id: string) => {
  assertValidObjectId(id);

  const existing = await Category.findById(id);
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  cleanupFiles(existing);

  const result = await Category.softDeleteById(id);
  return result;
};

export const CategoryService = {
  createCategoryToDB,
  getAllCategoriesFromDB,
  getCategoryByIdFromDB,
  updateCategoryToDB,
  deleteCategoryFromDB,
};
