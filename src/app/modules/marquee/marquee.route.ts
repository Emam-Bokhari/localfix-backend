import express from "express";
import { isAdmin } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { MarqueeController } from "./marquee.controller";
import { MarqueeValidation } from "./marquee.validation";

const router = express.Router();

router
  .route("/status")
  .get(MarqueeController.getMarqueeStatus)
  .patch(
    isAdmin,
    validateRequest(MarqueeValidation.toggleMarqueeStatusZodSchema),
    MarqueeController.toggleMarqueeStatus,
  );

router
  .route("/")
  .post(
    isAdmin,
    validateRequest(MarqueeValidation.createMarqueeZodSchema),
    MarqueeController.createMarquee,
  )
  .get(MarqueeController.getMarquees);

router
  .route("/:id")
  .get(MarqueeController.getMarqueeById)
  .patch(
    isAdmin,
    validateRequest(MarqueeValidation.updateMarqueeZodSchema),
    MarqueeController.updateMarquee,
  )
  .delete(isAdmin, MarqueeController.deleteMarquee);

export const MarqueeRoutes = router;
