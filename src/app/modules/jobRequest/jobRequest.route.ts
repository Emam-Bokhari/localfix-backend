import express from "express";
import { isAuthenticated, isHomeOwner } from "../../../helpers/authHelper";
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
