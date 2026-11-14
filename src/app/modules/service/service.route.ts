import express from "express";
import { isProfessional } from "../../../helpers/authHelper";
import optionalAuth from "../../middlewares/optionalAuth";
import validateRequest from "../../middlewares/validateRequest";
import { ServiceController } from "./service.controller";
import { ServiceValidation } from "./service.validation";

const router = express.Router();

router.get(
  "/professionals",
  optionalAuth(),
  ServiceController.getProfessionalsByCategory,
);

router.get(
  "/professionals/:professionalId",
  optionalAuth(),
  ServiceController.getProfessionalDetails,
);

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
