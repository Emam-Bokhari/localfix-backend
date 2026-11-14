import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { RuleRoutes } from "../modules/rule/rule.route";
import { FaqRoutes } from "../modules/faq/faq.route";
import { ChatRoutes } from "../modules/chat/chat.routes";
import { MessageRoutes } from "../modules/message/message.routes";
import { ContactUsRoutes } from "../modules/contactUs/contactUs.route";
import { BannerRoutes } from "../modules/banner/banner.route";
import { NotificationRoutes } from "../modules/notification/notification.routes";
import { FcmTokenRoutes } from "../modules/fcmToken/fcmToken.route";
import { WebhookRoutes } from "../modules/webhook/webhook.routes";
import { PackageRoutes } from "../modules/package/package.routes";
import { SubscriptionRoutes } from "../modules/subscription/subscription.routes";
import { AdminRoutes } from "../modules/admin/admin.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { CategoryRoutes } from "../modules/category/category.route";
import { CheckrRoutes } from "../modules/checkr/checkr.route";
import { MarqueeRoutes } from "../modules/marquee/marquee.route";
import { SiteSettingsRoutes } from "../modules/siteSettings/siteSettings.route";
import { ServiceRoutes } from "../modules/service/service.route";
import { ProfessionalRoutes } from "../modules/professional/professional.route";
import { JobRequestRoutes } from "../modules/jobRequest/jobRequest.route";
import { FavoriteRoutes } from "../modules/favorite/favorite.route";
import { SupportTicketRoutes } from "../modules/supportTicket/supportTicket.route";

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
    path: "/contact",
    route: ContactUsRoutes,
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
  {
    path: "/marquees",
    route: MarqueeRoutes,
  },
  {
    path: "/site-settings",
    route: SiteSettingsRoutes,
  },
  {
    path: "/services",
    route: ServiceRoutes,
  },
  {
    path: "/professionals",
    route: ProfessionalRoutes,
  },
  {
    path: "/job-requests",
    route: JobRequestRoutes,
  },
  {
    path: "/jobs",
    route: JobRequestRoutes,
  },
  {
    path: "/favorites",
    route: FavoriteRoutes,
  },
  {
    path: "/support-tickets",
    route: SupportTicketRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
