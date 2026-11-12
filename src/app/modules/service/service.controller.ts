import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ServiceService } from "./service.service";

const getProfessionalsByCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ServiceService.getProfessionalsByCategoryFromDB(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Professionals retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  },
);

const getProfessionalDetails = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ServiceService.getProfessionalDetailsFromDB(
      req.params.professionalId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Professional details retrieved successfully",
      data: result,
    });
  },
);

const createService = catchAsync(async (req: Request, res: Response) => {
  const { id: professionalId } = req.user as { id: string };
  const result = await ServiceService.createServiceToDB(
    professionalId,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Service created successfully",
    data: result,
  });
});

const getMyServices = catchAsync(async (req: Request, res: Response) => {
  const { id: professionalId } = req.user as { id: string };
  const result = await ServiceService.getMyServicesFromDB(
    professionalId,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Services retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyServiceById = catchAsync(async (req: Request, res: Response) => {
  const { id: professionalId } = req.user as { id: string };
  const result = await ServiceService.getMyServiceByIdFromDB(
    professionalId,
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service retrieved successfully",
    data: result,
  });
});

const updateMyService = catchAsync(async (req: Request, res: Response) => {
  const { id: professionalId } = req.user as { id: string };
  const result = await ServiceService.updateMyServiceToDB(
    professionalId,
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service updated successfully",
    data: result,
  });
});

const deleteMyService = catchAsync(async (req: Request, res: Response) => {
  const { id: professionalId } = req.user as { id: string };
  const result = await ServiceService.deleteMyServiceFromDB(
    professionalId,
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service deleted successfully",
    data: result,
  });
});

export const ServiceController = {
  getProfessionalsByCategory,
  getProfessionalDetails,
  createService,
  getMyServices,
  getMyServiceById,
  updateMyService,
  deleteMyService,
};

