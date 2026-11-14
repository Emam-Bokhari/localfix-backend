import express from "express";
import { isHomeOwnerOrProfessional } from "../../../helpers/authHelper";
import { FavoriteController } from "./favorite.controller";

const router = express.Router();

// Toggle favorite (supports body: { referenceId } or route param)
router.post(
  "/toggle",
  isHomeOwnerOrProfessional,
  FavoriteController.toggleFavorite,
);
router.post(
  "/toggle/:referenceId",
  isHomeOwnerOrProfessional,
  FavoriteController.toggleFavorite,
);
router.post(
  "/:referenceId",
  isHomeOwnerOrProfessional,
  FavoriteController.toggleFavorite,
);

// Get all favorites for current user
router.get("/", isHomeOwnerOrProfessional, FavoriteController.getFavorites);

// Check if a professional is favorited
router.get(
  "/status/:referenceId",
  isHomeOwnerOrProfessional,
  FavoriteController.checkFavoriteStatus,
);

// Get single favorite by ID or professional referenceId
router.get(
  "/:id",
  isHomeOwnerOrProfessional,
  FavoriteController.getSingleFavorite,
);

// Remove favorite
router.delete(
  "/:referenceId",
  isHomeOwnerOrProfessional,
  FavoriteController.deleteFavorite,
);

export const FavoriteRoutes = router;
