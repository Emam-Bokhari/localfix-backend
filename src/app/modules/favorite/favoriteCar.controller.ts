import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { FavoriteCarServices } from "./favoriteCar.service";

const toggleFavorite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const { referenceId } = req.body as {
    referenceId: string;
  };

  const result = await FavoriteCarServices.toggleFavorite({
    userId: id,
    referenceId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message || "Favorite toggled successfully",
    data: result,
  });
});

const getFavorite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const result = await FavoriteCarServices.getFavorite(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favorites are Retrieved Successfully",
    data: result,
  });
});

const getSingleFavorite = catchAsync(async (req, res) => {
  const { bookmarkId } = req.params;
  const { id: userId } = req.user as any;

  const result = await FavoriteCarServices.getSingleFavorite(
    userId,
    bookmarkId,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favorite is retrieved successfully by ID",
    data: result,
  });
});

const deleteFavorite = catchAsync(async (req, res) => {
  const { id } = req.user as { id: string };
  const { referenceId } = req.params;

  const result = await FavoriteCarServices.deleteFavorite(id, referenceId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Favorite is deleted successfully",
    data: result,
  });
});

export const FavoriteCarControllers = {
  toggleFavorite,
  getFavorite,
  deleteFavorite,
  getSingleFavorite,
};
