import express from "express";
import { BannerController } from "./banner.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BannerZodValidation } from "./banner.validation";
import { isAdmin } from "../../../helpers/authHelper";
import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    fileUploadHandler(),
    parseFileData({
      fieldName: "image",
      mode: "single",
    }),
    validateRequest(BannerZodValidation.upsertBannerValidationSchema),
    BannerController.upsertBanner,
  )
  .get(BannerController.getBanner);

export const BannerRoutes = router;
