import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";
import validateRequest from "../../middlewares/validateRequest";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = express.Router();

const uploadCategoryFiles = [
  fileUploadHandler(["coverImage", "icon"]),
  parseFileData(
    { fieldName: "coverImage", mode: "single" },
    { fieldName: "icon", mode: "single" },
  ),
];

router
  .route("/")
  .post(
    isAdmin,
    ...uploadCategoryFiles,
    validateRequest(CategoryValidation.createCategoryZodSchema),
    CategoryController.createCategory,
  )
  .get(CategoryController.getAllCategories);

router
  .route("/:id")
  .get(CategoryController.getCategoryById)
  .patch(
    isAdmin,
    ...uploadCategoryFiles,
    validateRequest(CategoryValidation.updateCategoryZodSchema),
    CategoryController.updateCategory,
  )
  .delete(isAdmin, CategoryController.deleteCategory);

export const CategoryRoutes = router;

