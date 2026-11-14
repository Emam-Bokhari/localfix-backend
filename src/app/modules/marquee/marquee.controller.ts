import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MarqueeService } from "./marquee.service";

const createMarquee = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.createMarqueeToDB(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Marquee keyword created successfully",
    data: result,
  });
});

const getMarquees = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.getMarqueesFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Marquee keywords retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMarqueeById = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.getMarqueeByIdFromDB(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Marquee keyword retrieved successfully",
    data: result,
  });
});

const updateMarquee = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.updateMarqueeToDB(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Marquee keyword updated successfully",
    data: result,
  });
});

const deleteMarquee = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.deleteMarqueeFromDB(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Marquee keyword deleted successfully",
    data: result,
  });
});

const getMarqueeStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.getMarqueeStatusFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Marquee status retrieved successfully",
    data: result,
  });
});

const toggleMarqueeStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await MarqueeService.toggleMarqueeStatusToDB(
    req.body?.isEnabled,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Homepage marquee ${result.isEnabled ? "enabled" : "disabled"} successfully`,
    data: result,
  });
});

export const MarqueeController = {
  createMarquee,
  getMarquees,
  getMarqueeById,
  updateMarquee,
  deleteMarquee,
  getMarqueeStatus,
  toggleMarqueeStatus,
};
