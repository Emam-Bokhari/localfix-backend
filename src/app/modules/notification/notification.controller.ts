import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { NotificationService } from "./notification.service";

const getNotificationFromDB = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    const result = await NotificationService.getNotificationFromDB(
      user,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notifications Retrieved Successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const readNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await NotificationService.readNotificationToDB(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification Read Successfully",
    data: result,
  });
});

const adminNotificationFromDB = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.adminNotificationFromDB(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notifications Retrieved Successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const adminReadNotification = catchAsync(
  async (req: Request, res: Response) => {
    const result = await NotificationService.adminReadNotificationToDB();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Notification Read Successfully",
      data: result,
    });
  },
);



// user single get
const getSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.getSingleNotificationFromDB(
    req.user,
    req.params.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification retrieved successfully",
    data: result,
  });
});

// user single read
const readSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.readSingleNotificationToDB(
    req.user,
    req.params.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

// admin single get
const adminGetSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.adminGetSingleNotificationFromDB(
    req.params.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin notification retrieved successfully",
    data: result,
  });
});

// admin single read
const adminReadSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.adminReadSingleNotificationToDB(
    req.params.id,
  );

  console.log(result, "RESULT");

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin notification marked as read",
    data: result,
  });
});

// user single delete
const deleteSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.deleteSingleNotificationFromDB(
    req.user,
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification deleted successfully",
    data: result,
  });
});

// user delete notifications (all or selected ids)
const deleteNotification = catchAsync(async (req, res) => {
  const ids =
    req.body?.ids ||
    (req.query?.ids
      ? typeof req.query.ids === "string"
        ? req.query.ids.split(",")
        : (req.query.ids as string[])
      : undefined);

  const result = await NotificationService.deleteNotificationsFromDB(
    req.user,
    ids,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notifications deleted successfully",
    data: result,
  });
});

// admin single delete
const adminDeleteSingleNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.adminDeleteSingleNotificationFromDB(
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin notification deleted successfully",
    data: result,
  });
});

// admin delete notifications (all or selected ids)
const adminDeleteNotification = catchAsync(async (req, res) => {
  const ids =
    req.body?.ids ||
    (req.query?.ids
      ? typeof req.query.ids === "string"
        ? req.query.ids.split(",")
        : (req.query.ids as string[])
      : undefined);

  const result = await NotificationService.adminDeleteNotificationsFromDB(ids);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Admin notifications deleted successfully",
    data: result,
  });
});

export const NotificationController = {
  adminNotificationFromDB,
  getNotificationFromDB,
  readNotification,
  adminReadNotification,
  getSingleNotification,
  readSingleNotification,
  adminGetSingleNotification,
  adminReadSingleNotification,
  deleteSingleNotification,
  deleteNotification,
  adminDeleteSingleNotification,
  adminDeleteNotification,
};
