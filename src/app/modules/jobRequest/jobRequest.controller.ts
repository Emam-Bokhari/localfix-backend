import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JobRequestService } from "./jobRequest.service";

const createJobRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await JobRequestService.createJobRequestToDB(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Job request created successfully",
    data: result,
  });
});

const getMyJobRequests = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = (req.user as { role?: string } | undefined)?.role;

  const result = await JobRequestService.getMyJobRequestsFromDB(
    userId,
    userRole,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Job requests retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getJobRequestById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = (req.user as { role?: string } | undefined)?.role;

  const result = await JobRequestService.getJobRequestByIdFromDB(
    req.params.id,
    userId,
    userRole,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Job request details retrieved successfully",
    data: result,
  });
});

const updateJobRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = (req.user as { role?: string } | undefined)?.role;

  const result = await JobRequestService.updateJobRequestToDB(
    req.params.id,
    userId,
    userRole,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Job request updated successfully",
    data: result,
  });
});

const deleteJobRequest = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = (req.user as { role?: string } | undefined)?.role;

  const result = await JobRequestService.deleteJobRequestFromDB(
    req.params.id,
    userId,
    userRole,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Job request deleted successfully",
    data: result,
  });
});

export const JobRequestController = {
  createJobRequest,
  getMyJobRequests,
  getJobRequestById,
  updateJobRequest,
  deleteJobRequest,
};

