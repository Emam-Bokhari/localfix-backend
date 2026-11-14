import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ProfessionalService } from "./professional.service";

const getAllProfessionals = catchAsync(async (req: Request, res: Response) => {
  const currentUserId =
    (req.user as any)?.id ||
    (req.user as any)?.userId ||
    (req.user as any)?._id;
  const result = await ProfessionalService.getAllProfessionalsFromDB(
    req.query,
    currentUserId,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Professionals retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getProfessionalDetails = catchAsync(
  async (req: Request, res: Response) => {
    const currentUserId =
      (req.user as any)?.id ||
      (req.user as any)?.userId ||
      (req.user as any)?._id;
    const result = await ProfessionalService.getProfessionalDetailsFromDB(
      req.params.professionalId,
      currentUserId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Professional details retrieved successfully",
      data: result,
    });
  },
);

export const ProfessionalController = {
  getAllProfessionals,
  getProfessionalDetails,
};
