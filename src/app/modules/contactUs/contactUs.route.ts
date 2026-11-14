import express from "express";
import { ContactUsControllers } from "./contactUs.controller";
import { isAdmin } from "../../../helpers/authHelper";
import optionalAuth from "../../middlewares/optionalAuth";
import validateRequest from "../../middlewares/validateRequest";
import { ContactUsValidation } from "./contactUs.validation";

const router = express.Router();

router
  .route("/")
  .post(
    optionalAuth(),
    validateRequest(ContactUsValidation.createContactUsZodSchema),
    ContactUsControllers.submitContactUs,
  )
  .get(isAdmin, ContactUsControllers.getAllContactUs);

router
  .route("/:id")
  .get(isAdmin, ContactUsControllers.getContactUsById)
  .patch(
    isAdmin,
    validateRequest(ContactUsValidation.updateContactUsStatusZodSchema),
    ContactUsControllers.updateContactUsStatus,
  )
  .delete(isAdmin, ContactUsControllers.deleteContactUsById);

export const ContactUsRoutes = router;
