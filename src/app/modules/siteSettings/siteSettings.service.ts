import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import { TSiteSettings } from "./siteSettings.interface";
import { SiteSettings } from "./siteSettings.model";

const FILE_FIELDS = ["headerLogo", "footerLogo", "favicon"] as const;

const cleanupUploadedFiles = (payload: Partial<TSiteSettings>) => {
  for (const field of FILE_FIELDS) {
    if (payload[field]) {
      unlinkFile(payload[field]);
    }
  }
};

const upsertSiteSettingsToDB = async (
  payload: Partial<TSiteSettings>,
): Promise<TSiteSettings> => {
  const existingSiteSettings = await SiteSettings.findOne();

  if (existingSiteSettings) {
    for (const field of FILE_FIELDS) {
      if (
        payload[field] &&
        existingSiteSettings[field] &&
        payload[field] !== existingSiteSettings[field]
      ) {
        unlinkFile(existingSiteSettings[field]);
      }
    }

    const updatedSiteSettings = await SiteSettings.findByIdAndUpdate(
      existingSiteSettings._id,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedSiteSettings) {
      cleanupUploadedFiles(payload);
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Failed to update site settings",
      );
    }

    return updatedSiteSettings;
  }

  if (
    !payload.platformBrandName ||
    !payload.supportEmail ||
    !payload.supportPhone ||
    !payload.address
  ) {
    cleanupUploadedFiles(payload);
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Platform brand name, support email, support phone, and address are required to create site settings",
    );
  }

  const createdSiteSettings = await SiteSettings.create(payload);
  if (!createdSiteSettings) {
    cleanupUploadedFiles(payload);
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create site settings",
    );
  }

  return createdSiteSettings;
};

const getSiteSettingsFromDB = async (): Promise<TSiteSettings | null> => {
  return await SiteSettings.findOne();
};

export const SiteSettingsService = {
  upsertSiteSettingsToDB,
  getSiteSettingsFromDB,
};

