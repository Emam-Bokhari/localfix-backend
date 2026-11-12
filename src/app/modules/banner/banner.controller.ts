import { Request, Response } from "express";
import { BannerService } from "./banner.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const upsertBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.upsertBannerToDB(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Banner saved successfully",
    data: result,
  });
});

const getBanner = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getBannerFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Banner retrieved successfully",
    data: result,
  });
});

export const BannerController = {
  upsertBanner,
  getBanner,
};
