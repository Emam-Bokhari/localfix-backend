import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { RuleRoutes } from "../modules/rule/rule.route";
import { FaqRoutes } from "../modules/faq/faq.route";
import { ChatRoutes } from "../modules/chat/chat.routes";
import { MessageRoutes } from "../modules/message/message.routes";
import { SupportRoutes } from "../modules/support/support.route";
import { BannerRoutes } from "../modules/banner/banner.route";
import { NotificationRoutes } from "../modules/notification/notification.routes";
import { FcmTokenRoutes } from "../modules/fcmToken/fcmToken.route";
import { NotificationPreferenceRoutes } from "../modules/notificationPreference/notificationPreference.route";
import { WebhookRoutes } from "../modules/webhook/webhook.routes";
import { PackageRoutes } from "../modules/package/package.routes";
import { SubscriptionRoutes } from "../modules/subscription/subscription.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { CategoryRoutes } from "../modules/category/category.route";
import { CheckrRoutes } from "../modules/checkr/checkr.route";

const router = express.Router();

const apiRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/rules",
    route: RuleRoutes,
  },
  {
    path: "/faqs",
    route: FaqRoutes,
  },
  {
    path: "/chats",
    route: ChatRoutes,
  },
  {
    path: "/messages",
    route: MessageRoutes,
  },
  {
    path: "/supports",
    route: SupportRoutes,
  },
  {
    path: "/banners",
    route: BannerRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/fcmTokens",
    route: FcmTokenRoutes,
  },
  {
    path: "/notification-preferences",
    route: NotificationPreferenceRoutes,
  },
  {
    path: "/webhook",
    route: WebhookRoutes,
  },
  {
    path: "/packages",
    route: PackageRoutes,
  },
  {
    path: "/subscriptions",
    route: SubscriptionRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/checkr",
    route: CheckrRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
