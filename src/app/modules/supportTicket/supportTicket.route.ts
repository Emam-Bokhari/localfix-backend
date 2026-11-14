import express from "express";
import { isAdmin, isAuthenticated } from "../../../helpers/authHelper";
import validateRequest from "../../middlewares/validateRequest";
import { SupportTicketControllers } from "./supportTicket.controller";
import { SupportTicketValidation } from "./supportTicket.validation";

const router = express.Router();

router
  .route("/")
  .post(
    isAuthenticated,
    validateRequest(SupportTicketValidation.createSupportTicketZodSchema),
    SupportTicketControllers.createSupportTicket,
  )
  .get(isAuthenticated, SupportTicketControllers.getAllSupportTickets);

router.get("/stats", isAdmin, SupportTicketControllers.getSupportTicketStats);

router
  .route("/:id")
  .get(isAuthenticated, SupportTicketControllers.getSupportTicketById)
  .patch(
    isAdmin,
    validateRequest(SupportTicketValidation.updateSupportTicketZodSchema),
    SupportTicketControllers.updateSupportTicket,
  )
  .delete(isAdmin, SupportTicketControllers.deleteSupportTicket);

router.post(
  "/:id/reply",
  isAuthenticated,
  validateRequest(SupportTicketValidation.addReplyZodSchema),
  SupportTicketControllers.addReplyToTicket,
);

export const SupportTicketRoutes = router;

