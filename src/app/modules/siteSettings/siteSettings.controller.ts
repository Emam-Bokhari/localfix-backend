import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { SiteSettingsService } from "./siteSettings.service";

const upsertSiteSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SiteSettingsService.upsertSiteSettingsToDB(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Site settings saved successfully",
    data: result,
  });
});

const getSiteSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SiteSettingsService.getSiteSettingsFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Site settings retrieved successfully",
    data: result,
  });
});

export const SiteSettingsController = {
  upsertSiteSettings,
  getSiteSettings,
};

