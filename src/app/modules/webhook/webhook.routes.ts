import express from "express";
import { WebhookController } from "./webhook.controller";
import { CheckrControllers } from "../checkr/checkr.controller";

const router = express.Router();

// Root Stripe Webhook Endpoint (No Auth - Protected via Stripe signature)
router.post("/", WebhookController.handleStripeWebhook);

// Checkr Background Check Webhook Endpoint (/webhook/checkr)
router.post("/checkr", CheckrControllers.handleWebhook);

export const WebhookRoutes = router;
