import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { FavoriteService } from "./favorite.service";
import ApiError from "../../../errors/ApiErrors";

const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const referenceId =
    req.body?.referenceId ||
    req.body?.id ||
    req.params?.referenceId ||
    req.params?.id;

  if (!referenceId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "referenceId is required to toggle favorite",
    );
  }

  const result = await FavoriteService.toggleFavorite({
    userId,
    referenceId,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getFavorites = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const result = await FavoriteService.getFavorites(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Favorites retrieved successfully",
    data: result,
  });
});

const checkFavoriteStatus = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const referenceId =
    req.params?.referenceId ||
    req.params?.id ||
    (req.query?.referenceId as string);

  if (!referenceId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "referenceId is required to check status",
    );
  }

  const result = await FavoriteService.checkFavoriteStatus(userId, referenceId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Favorite status checked successfully",
    data: result,
  });
});

const getSingleFavorite = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const id = req.params.id || req.params.bookmarkId;

  const result = await FavoriteService.getSingleFavorite(userId, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Favorite retrieved successfully",
    data: result,
  });
});

const deleteFavorite = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const referenceId = req.params.referenceId || req.params.id;

  const result = await FavoriteService.deleteFavorite(userId, referenceId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const FavoriteController = {
  toggleFavorite,
  getFavorites,
  checkFavoriteStatus,
  getSingleFavorite,
  deleteFavorite,
};

