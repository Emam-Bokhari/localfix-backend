import express from "express";
import optionalAuth from "../../middlewares/optionalAuth";
import { ProfessionalController } from "./professional.controller";

const router = express.Router();

router.get("/", optionalAuth(), ProfessionalController.getAllProfessionals);

router.get(
  "/:professionalId",
  optionalAuth(),
  ProfessionalController.getProfessionalDetails,
);

export const ProfessionalRoutes = router;
