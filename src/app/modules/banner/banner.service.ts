import { StatusCodes } from "http-status-codes";
import { Banner } from "./banner.model";
import unlinkFile from "../../../shared/unlinkFile";
import { TBanner } from "./banner.interface";
import ApiError from "../../../errors/ApiErrors";

const upsertBannerToDB = async (
  payload: Partial<TBanner>,
): Promise<TBanner> => {
  const existingBanner = await Banner.findOne();

  if (existingBanner) {
    if (
      payload.image &&
      existingBanner.image &&
      payload.image !== existingBanner.image
    ) {
      unlinkFile(existingBanner.image);
    }

    const updatedBanner = await Banner.findByIdAndUpdate(
      existingBanner._id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedBanner) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update banner");
    }

    return updatedBanner;
  }

  if (!payload.headline || !payload.description || !payload.image) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Headline, description, and image are required to create a banner",
    );
  }

  const createdBanner = await Banner.create(payload);
  if (!createdBanner) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create banner");
  }

  return createdBanner;
};

const getBannerFromDB = async (): Promise<TBanner | null> => {
  return await Banner.findOne();
};

export const BannerService = {
  upsertBannerToDB,
  getBannerFromDB,
};
