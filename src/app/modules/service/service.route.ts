import express from "express";
import { isProfessional } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceController } from "./service.controller";
import { ServiceValidation } from "./service.validation";

const router = express.Router();

router
  .route("/")
  .post(
    isProfessional,
    validateRequest(ServiceValidation.createServiceZodSchema),
    ServiceController.createService,
  )
  .get(isProfessional, ServiceController.getMyServices);

router
  .route("/:id")
  .get(isProfessional, ServiceController.getMyServiceById)
  .patch(
    isProfessional,
    validateRequest(ServiceValidation.updateServiceZodSchema),
    ServiceController.updateMyService,
  )
  .delete(isProfessional, ServiceController.deleteMyService);

export const ServiceRoutes = router;

