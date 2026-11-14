import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";
import validateRequest from "../../middlewares/validateRequest";
import { SiteSettingsController } from "./siteSettings.controller";
import { SiteSettingsZodValidation } from "./siteSettings.validation";

const router = express.Router();

router
  .route("/")
  .post(
    isAdmin,
    fileUploadHandler(["headerLogo", "footerLogo", "favicon"]),
    parseFileData(
      { fieldName: "headerLogo", mode: "single" },
      { fieldName: "footerLogo", mode: "single" },
      { fieldName: "favicon", mode: "single" },
    ),
    validateRequest(
      SiteSettingsZodValidation.upsertSiteSettingsValidationSchema,
    ),
    SiteSettingsController.upsertSiteSettings,
  )
  .get(SiteSettingsController.getSiteSettings);

export const SiteSettingsRoutes = router;
