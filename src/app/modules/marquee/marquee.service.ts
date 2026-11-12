import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { TMarquee, TMarqueeSetting } from "./marquee.interface";
import { Marquee, MarqueeSetting } from "./marquee.model";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createMarqueeToDB = async (payload: Partial<TMarquee>) => {
  const keyword = payload.keyword?.trim();
  if (!keyword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Service keyword is required");
  }

  const existingKeyword = await Marquee.findOne({
    keyword: { $regex: `^${escapeRegExp(keyword)}$`, $options: "i" },
  });

  if (existingKeyword) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Service keyword already exists in marquee",
    );
  }

  let order = payload.order;
  if (order === undefined) {
    const lastItem = await Marquee.findOne().sort({ order: -1 }).lean();
    order = lastItem && typeof lastItem.order === "number" ? lastItem.order + 1 : 1;
  }

  const marquee = await Marquee.create({
    keyword,
    isEnabled: payload.isEnabled ?? true,
    order,
  });

  if (!marquee) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create marquee keyword",
    );
  }

  return marquee;
};

const getMarqueesFromDB = async (query: Record<string, unknown> = {}) => {
  const queryObj = { sort: "order createdAt", ...query };

  const queryBuilder = new QueryBuilder(Marquee.find(), queryObj)
    .search(["keyword"])
    .filter()
    .sort();

  if (query.page || query.limit) {
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

const getMarqueeByIdFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID");
  }

  const marquee = await Marquee.findById(id).lean();
  if (!marquee) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No marquee keyword found by this ID",
    );
  }

  return marquee;
};

const updateMarqueeToDB = async (id: string, payload: Partial<TMarquee>) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID");
  }

  const updateData: Partial<TMarquee> = { ...payload };

  if (updateData.keyword !== undefined) {
    const trimmedKeyword = updateData.keyword.trim();
    const duplicate = await Marquee.findOne({
      _id: { $ne: id },
      keyword: { $regex: `^${escapeRegExp(trimmedKeyword)}$`, $options: "i" },
    });

    if (duplicate) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Service keyword already exists in marquee",
      );
    }

    updateData.keyword = trimmedKeyword;
  }

  const updatedMarquee = await Marquee.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedMarquee) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No marquee keyword found by this ID",
    );
  }

  return updatedMarquee;
};

const deleteMarqueeFromDB = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid ID");
  }

  const result = await Marquee.softDeleteById(id);
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No marquee keyword found by this ID",
    );
  }

  return result;
};

const getMarqueeStatusFromDB = async (): Promise<TMarqueeSetting> => {
  let setting = await MarqueeSetting.findOne().lean();
  if (!setting) {
    setting = (await MarqueeSetting.create({ isEnabled: true })).toObject();
  }
  return setting;
};

const toggleMarqueeStatusToDB = async (isEnabled?: boolean) => {
  let setting = await MarqueeSetting.findOne();

  if (!setting) {
    setting = await MarqueeSetting.create({
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });
    return setting;
  }

  setting.isEnabled =
    isEnabled !== undefined ? isEnabled : !setting.isEnabled;
  await setting.save();

  return setting;
};

export const MarqueeService = {
  createMarqueeToDB,
  getMarqueesFromDB,
  getMarqueeByIdFromDB,
  updateMarqueeToDB,
  deleteMarqueeFromDB,
  getMarqueeStatusFromDB,
  toggleMarqueeStatusToDB,
};

