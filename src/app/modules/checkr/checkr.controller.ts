import crypto from "crypto";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { CheckrService } from "./checkr.service";

const initiateBackgroundCheck = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const forceNew =
      req.body?.forceNew === true || req.body?.forceNew === "true";

    const result = await CheckrService.initiateBackgroundCheckForUser(user.id, {
      forceNew,
    });

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Checkr background check screening link generated successfully",
      data: result,
    });
  },
);

const startPreSignupScreening = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CheckrService.startPreSignupScreening(req.body);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Checkr screening portal link created successfully",
      data: result,
    });
  },
);

const getMyBackgroundCheckStatus = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const sync = req.query.sync === "true";

    const result = await CheckrService.getBackgroundCheckStatusFromDB(
      user.id,
      sync,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Background check status retrieved successfully",
      data: result,
    });
  },
);

const getUserBackgroundCheckStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const sync = req.query.sync === "true";

    const result = await CheckrService.getBackgroundCheckStatusFromDB(
      userId,
      sync,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Professional background check status retrieved successfully",
      data: result,
    });
  },
);

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  let isSignatureVerified = false;
  const signatureHeader = req.headers["x-checkr-signature"] as string;

  if (!signatureHeader) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Warning: Missing x-checkr-signature header, bypassing signature check in development mode.",
      );
      isSignatureVerified = true;
    } else {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        "Missing x-checkr-signature header",
      );
    }
  }

  const signingKey = config.checkr.signingKey || config.checkr.apiKey;
  if (!signingKey && !isSignatureVerified) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Checkr signing key or API key is not configured",
    );
  }

  if (signatureHeader && signingKey && !isSignatureVerified) {
    const signature = signatureHeader.replace("sha256=", "");
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Raw body is missing for signature verification",
      );
    }

    const computedHex = crypto
      .createHmac("sha256", signingKey)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature.toLowerCase(), "hex");
    const compBuffer = Buffer.from(computedHex.toLowerCase(), "hex");

    if (
      sigBuffer.length === compBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, compBuffer)
    ) {
      isSignatureVerified = true;
    } else if (process.env.NODE_ENV === "development") {
      console.warn(
        "Warning: Invalid Checkr webhook signature, bypassing in development mode.",
      );
      isSignatureVerified = true;
    } else {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid webhook signature");
    }
  }

  const result = await CheckrService.processWebhookEvent(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Webhook event processed successfully",
    data: result,
  });
});

export const CheckrControllers = {
  initiateBackgroundCheck,
  startPreSignupScreening,
  getMyBackgroundCheckStatus,
  getUserBackgroundCheckStatus,
  handleWebhook,
};
