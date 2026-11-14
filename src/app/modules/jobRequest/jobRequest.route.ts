import express from "express";
import {
  isAuthenticated,
  isHomeOwner,
  isProfessional,
} from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";
import validateRequest from "../../middlewares/validateRequest";
import { JobRequestController } from "./jobRequest.controller";
import { JobRequestValidation } from "./jobRequest.validation";

const router = express.Router();

const uploadJobPhotos = [
  fileUploadHandler(["projectPhotos"]),
  parseFileData({ fieldName: "projectPhotos", mode: "multiple" }),
];

// Marketplace leads routes for professionals
router.get(
  "/marketplace-leads",
  isProfessional,
  JobRequestController.getMarketplaceLeads,
);

router.get(
  "/marketplace-leads/:id",
  isProfessional,
  JobRequestController.getSingleMarketplaceLead,
);

router.post(
  "/marketplace-leads/:id/reject",
  isProfessional,
  JobRequestController.rejectMarketplaceLead,
);

router
  .route("/")
  .post(
    isHomeOwner,
    ...uploadJobPhotos,
    validateRequest(JobRequestValidation.createJobRequestZodSchema),
    JobRequestController.createJobRequest,
  )
  .get(isHomeOwner, JobRequestController.getMyJobRequests);

router.get("/my-requests", isHomeOwner, JobRequestController.getMyJobRequests);

router
  .route("/:id")
  .get(isAuthenticated, JobRequestController.getJobRequestById)
  .patch(
    isHomeOwner,
    ...uploadJobPhotos,
    validateRequest(JobRequestValidation.updateJobRequestZodSchema),
    JobRequestController.updateJobRequest,
  )
  .delete(isHomeOwner, JobRequestController.deleteJobRequest);

export const JobRequestRoutes = router;
