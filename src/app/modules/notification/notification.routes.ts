import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";
import { NotificationController } from "./notification.controller";

const router = express.Router();

const allRoles = [
  USER_ROLES.HOME_OWNER,
  USER_ROLES.PROFESSIONAL,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

// user notification collection routes
router
  .route("/")
  .get(auth(...allRoles), NotificationController.getNotificationFromDB)
  .patch(auth(...allRoles), NotificationController.readNotification)
  .delete(auth(...allRoles), NotificationController.deleteNotification);

// admin routes
router
  .route("/admin")
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminNotificationFromDB,
  )
  .patch(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminReadNotification,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminDeleteNotification,
  );

router
  .route("/admin/:id")
  .get(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminGetSingleNotification,
  )
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    NotificationController.adminDeleteSingleNotification,
  );

router.patch(
  "/admin/:id/read",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.adminReadSingleNotification,
);

// user single routes
router
  .route("/:id")
  .get(auth(...allRoles), NotificationController.getSingleNotification)
  .delete(auth(...allRoles), NotificationController.deleteSingleNotification);

router.patch(
  "/:id/read",
  auth(...allRoles),
  NotificationController.readSingleNotification,
);

export const NotificationRoutes = router;
