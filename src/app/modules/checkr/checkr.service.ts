import axios from "axios";
import { StatusCodes } from "http-status-codes";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import {
  APPROVAL_STATUS,
  CHECKR_INVITATION_STATUS,
  CHECKR_VERIFICATION_STATUS,
  USER_ROLES,
} from "../../../enums/user";
import { User } from "../user/user.model";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { normalizeUsStateCode } from "./checkr.constant";

const checkrClient = axios.create({
  baseURL: config.checkr.baseUrl,
  auth: {
    username: config.checkr.apiKey,
    password: "",
  },
});

type TWorkLocation = {
  country: string;
  state?: string;
  city?: string;
};

const ensureCheckrConfigured = () => {
  if (!config.checkr.apiKey) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Checkr API key is not configured",
    );
  }
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {
      first_name: "Professional",
      last_name: "User",
      no_middle_name: true,
    };
  }
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: parts[0], no_middle_name: true };
  }
  if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1], no_middle_name: true };
  }
  return {
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
};

const buildWorkLocations = (state?: string, city?: string): TWorkLocation[] => {
  const stateCode = normalizeUsStateCode(state);
  if (stateCode) {
    return [
      {
        country: "US",
        state: stateCode,
        ...(city ? { city } : {}),
      },
    ];
  }
  return [{ country: "US" }];
};

const extractCheckrErrorMessage = (error: any): string => {
  const data = error?.response?.data;
  if (typeof data?.error === "string") return data.error;
  if (Array.isArray(data?.error)) return data.error.join(", ");
  if (typeof data?.message === "string") return data.message;
  return error?.message || "Checkr API request failed";
};

/**
 * Create a Checkr candidate for a service professional (hosted screening flow).
 */
const createCandidate = async (candidateData: {
  name: string;
  email: string;
  phone?: string;
  zipcode?: string;
  custom_id?: string;
  work_locations?: TWorkLocation[];
}) => {
  ensureCheckrConfigured();
  const { first_name, middle_name, last_name, no_middle_name } = splitFullName(
    candidateData.name,
  );

  const payload: Record<string, any> = {
    first_name,
    last_name,
    email: candidateData.email,
    ...(middle_name ? { middle_name } : { no_middle_name }),
    ...(candidateData.phone ? { phone: candidateData.phone } : {}),
    ...(candidateData.zipcode ? { zipcode: candidateData.zipcode } : {}),
    ...(candidateData.custom_id ? { custom_id: candidateData.custom_id } : {}),
    ...(candidateData.work_locations?.length
      ? { work_locations: candidateData.work_locations }
      : {}),
  };

  try {
    const response = await checkrClient.post("/v1/candidates", payload);
    return response.data;
  } catch (error: any) {
    console.error("Checkr Candidate Creation Failed:", {
      status: error.response?.status,
      error: error.response?.data || error.message,
    });
    throw new ApiError(
      error.response?.status || StatusCodes.BAD_GATEWAY,
      extractCheckrErrorMessage(error),
    );
  }
};

/**
 * Create a Checkr hosted invitation link so the professional can complete screening on Checkr Portal.
 */
const createInvitation = async (
  candidateId: string,
  workLocations?: TWorkLocation[],
) => {
  ensureCheckrConfigured();

  const payload: Record<string, any> = {
    candidate_id: candidateId,
    package: config.checkr.backgroundCheckPackage,
    ...(workLocations?.length ? { work_locations: workLocations } : {}),
  };

  try {
    const response = await checkrClient.post("/v1/invitations", payload);
    return response.data;
  } catch (error: any) {
    console.error("Checkr Invitation Creation Failed:", {
      status: error.response?.status,
      error: error.response?.data || error.message,
    });
    throw new ApiError(
      error.response?.status || StatusCodes.BAD_GATEWAY,
      extractCheckrErrorMessage(error),
    );
  }
};

const getInvitation = async (invitationId: string) => {
  ensureCheckrConfigured();
  try {
    const response = await checkrClient.get(`/v1/invitations/${invitationId}`);
    return response.data;
  } catch (error: any) {
    throw new ApiError(
      error.response?.status || StatusCodes.BAD_GATEWAY,
      extractCheckrErrorMessage(error),
    );
  }
};

const getReport = async (reportId: string) => {
  ensureCheckrConfigured();
  try {
    const response = await checkrClient.get(`/v1/reports/${reportId}`);
    return response.data;
  } catch (error: any) {
    throw new ApiError(
      error.response?.status || StatusCodes.BAD_GATEWAY,
      extractCheckrErrorMessage(error),
    );
  }
};

/**
 * Initiate Checkr background screening (Candidate + Hosted Invitation URL) for a registered professional.
 */
const initiateBackgroundCheckForUser = async (
  userId: string,
  options?: { forceNew?: boolean },
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.role !== USER_ROLES.PROFESSIONAL) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Background check is only required for professional accounts",
    );
  }

  if (user.backgroundCheck?.status === CHECKR_VERIFICATION_STATUS.VERIFIED) {
    return {
      candidateId: user.backgroundCheck.checkrCandidateId || null,
      invitationId: user.backgroundCheck.checkrInvitationId || null,
      invitationUrl: user.backgroundCheck.checkrInvitationUrl || null,
      status: user.backgroundCheck.status,
      invitationStatus: user.backgroundCheck.invitationStatus,
      package:
        user.backgroundCheck.checkrPackage ||
        config.checkr.backgroundCheckPackage,
      alreadyVerified: true,
    };
  }

  // Reuse existing pending invitation unless forceNew or expired
  if (
    !options?.forceNew &&
    user.backgroundCheck?.checkrInvitationId &&
    user.backgroundCheck?.checkrInvitationUrl &&
    user.backgroundCheck?.invitationStatus === CHECKR_INVITATION_STATUS.PENDING
  ) {
    return {
      candidateId: user.backgroundCheck.checkrCandidateId || null,
      invitationId: user.backgroundCheck.checkrInvitationId,
      invitationUrl: user.backgroundCheck.checkrInvitationUrl,
      status: user.backgroundCheck.status || CHECKR_VERIFICATION_STATUS.PENDING,
      invitationStatus: user.backgroundCheck.invitationStatus,
      package:
        user.backgroundCheck.checkrPackage ||
        config.checkr.backgroundCheckPackage,
    };
  }

  const stateForWorkLocation = user.tradeLicense?.state || user.state;
  const workLocations = buildWorkLocations(stateForWorkLocation, user.city);

  let candidateId = user.backgroundCheck?.checkrCandidateId;
  if (!candidateId) {
    const candidate = await createCandidate({
      name: user.name,
      email: user.email,
      phone: user.phone,
      zipcode: user.zipCode,
      custom_id: user._id.toString(),
      work_locations: workLocations,
    });
    candidateId = candidate.id;
  }

  const invitation = await createInvitation(candidateId!, workLocations);

  const now = new Date();
  await User.findByIdAndUpdate(user._id, {
    $set: {
      "backgroundCheck.consentAccepted": true,
      "backgroundCheck.consentAcceptedAt":
        user.backgroundCheck?.consentAcceptedAt || now,
      "backgroundCheck.status": CHECKR_VERIFICATION_STATUS.PENDING,
      "backgroundCheck.checkrCandidateId": candidateId,
      "backgroundCheck.checkrInvitationId": invitation.id,
      "backgroundCheck.checkrInvitationUrl": invitation.invitation_url,
      "backgroundCheck.invitationStatus": CHECKR_INVITATION_STATUS.PENDING,
      "backgroundCheck.checkrPackage":
        invitation.package || config.checkr.backgroundCheckPackage,
      "backgroundCheck.lastCheckedAt": now,
      "backgroundCheck.notes":
        "Checkr screening invitation created. Awaiting candidate completion.",
    },
  });

  return {
    candidateId,
    invitationId: invitation.id,
    invitationUrl: invitation.invitation_url,
    status: CHECKR_VERIFICATION_STATUS.PENDING,
    invitationStatus: CHECKR_INVITATION_STATUS.PENDING,
    package: invitation.package || config.checkr.backgroundCheckPackage,
  };
};

/**
 * Create a Checkr candidate + hosted screening invitation prior to final signup submission
 * (supports "Start on Checkr" button on Step 4 before clicking "Submit Application & Finish").
 */
const startPreSignupScreening = async (payload: {
  name: string;
  email: string;
  phone?: string;
  zipCode?: string;
  state?: string;
}) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && existingUser.verified) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "This email is already registered!",
    );
  }

  if (existingUser && existingUser.role === USER_ROLES.PROFESSIONAL) {
    return initiateBackgroundCheckForUser(existingUser._id.toString());
  }

  const workLocations = buildWorkLocations(payload.state);
  const candidate = await createCandidate({
    name: payload.name,
    email: normalizedEmail,
    phone: payload.phone,
    zipcode: payload.zipCode,
    work_locations: workLocations,
  });

  const invitation = await createInvitation(candidate.id, workLocations);

  return {
    candidateId: candidate.id,
    invitationId: invitation.id,
    invitationUrl: invitation.invitation_url,
    status: CHECKR_VERIFICATION_STATUS.PENDING,
    invitationStatus: CHECKR_INVITATION_STATUS.PENDING,
    package: invitation.package || config.checkr.backgroundCheckPackage,
  };
};

/**
 * Map a Checkr report object to User backgroundCheck update fields.
 */
const mapReportToVerificationState = (reportObj: any) => {
  const rawStatus = (reportObj?.status || "").toLowerCase();
  const rawResult = reportObj?.result
    ? String(reportObj.result).toLowerCase()
    : null;

  let mappedStatus = CHECKR_VERIFICATION_STATUS.PENDING;
  let passed = false;
  let notes = "Background check is in progress.";

  if (rawStatus === "complete" || rawStatus === "completed") {
    if (rawResult === "clear") {
      mappedStatus = CHECKR_VERIFICATION_STATUS.VERIFIED;
      passed = true;
      notes = "Checkr background check clear.";
    } else {
      mappedStatus = CHECKR_VERIFICATION_STATUS.REVIEW_REQUIRED;
      passed = false;
      notes = "Checkr background check requires manual review.";
    }
  } else if (rawStatus === "pending" || rawStatus === "suspended") {
    mappedStatus = CHECKR_VERIFICATION_STATUS.PENDING;
    notes =
      rawStatus === "suspended"
        ? "Checkr background check is temporarily suspended."
        : "Checkr background check is pending.";
  } else if (rawStatus === "canceled" || rawStatus === "disputed") {
    mappedStatus = CHECKR_VERIFICATION_STATUS.FAILED;
    notes = `Checkr background check ${rawStatus}.`;
  }

  return { mappedStatus, passed, rawResult, notes };
};

/**
 * Fetch background check status for a user, optionally syncing live state from Checkr API.
 */
const getBackgroundCheckStatusFromDB = async (
  userId: string,
  syncWithCheckr = false,
) => {
  const user = await User.findById(userId).select(
    "name email role approvalStatus backgroundCheck",
  );
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (syncWithCheckr && user.backgroundCheck) {
    const { checkrReportId, checkrInvitationId } = user.backgroundCheck;

    if (checkrReportId) {
      const report = await getReport(checkrReportId);
      const { mappedStatus, passed, rawResult, notes } =
        mapReportToVerificationState(report);

      const updateFields: Record<string, any> = {
        "backgroundCheck.status": mappedStatus,
        "backgroundCheck.passed": passed,
        "backgroundCheck.result": rawResult,
        "backgroundCheck.lastCheckedAt": new Date(),
        "backgroundCheck.notes": notes,
      };
      if (mappedStatus === CHECKR_VERIFICATION_STATUS.VERIFIED) {
        updateFields["backgroundCheck.verifiedAt"] =
          user.backgroundCheck.verifiedAt || new Date();
        updateFields.approvalStatus = APPROVAL_STATUS.APPROVED;
      }

      const updated = await User.findByIdAndUpdate(
        user._id,
        { $set: updateFields },
        { new: true },
      ).select("name email role approvalStatus backgroundCheck");

      return updated;
    }

    if (checkrInvitationId) {
      const invitation = await getInvitation(checkrInvitationId);
      const invStatus = (invitation?.status || "").toLowerCase();
      const mappedInvStatus =
        invStatus === "completed"
          ? CHECKR_INVITATION_STATUS.COMPLETED
          : invStatus === "expired"
            ? CHECKR_INVITATION_STATUS.EXPIRED
            : CHECKR_INVITATION_STATUS.PENDING;

      const updateFields: Record<string, any> = {
        "backgroundCheck.invitationStatus": mappedInvStatus,
        "backgroundCheck.lastCheckedAt": new Date(),
      };
      if (invitation?.report_id) {
        updateFields["backgroundCheck.checkrReportId"] = invitation.report_id;
      }

      const updated = await User.findByIdAndUpdate(
        user._id,
        { $set: updateFields },
        { new: true },
      ).select("name email role approvalStatus backgroundCheck");

      return updated;
    }
  }

  return user;
};

/**
 * Process Checkr webhook events (invitation & report lifecycle) and update the Professional user.
 */
const processWebhookEvent = async (event: any) => {
  if (!event || !event.data?.object) {
    return { processed: false, reason: "Invalid event payload" };
  }

  const dataObj = event.data.object;
  const eventType: string = event.type || "";

  // 1. Handle Invitation lifecycle events
  if (dataObj.object === "invitation" || eventType.startsWith("invitation.")) {
    const invitationId = dataObj.id;
    const candidateId = dataObj.candidate_id;
    const rawStatus = (dataObj.status || "").toLowerCase();

    const user = await User.findOne({
      $or: [
        ...(invitationId
          ? [{ "backgroundCheck.checkrInvitationId": invitationId }]
          : []),
        ...(candidateId
          ? [{ "backgroundCheck.checkrCandidateId": candidateId }]
          : []),
      ],
    });

    if (!user) {
      return {
        processed: false,
        reason: "User not found for invitation event",
      };
    }

    let invitationStatus = CHECKR_INVITATION_STATUS.PENDING;
    let notes = "Checkr invitation pending.";

    if (eventType === "invitation.completed" || rawStatus === "completed") {
      invitationStatus = CHECKR_INVITATION_STATUS.COMPLETED;
      notes =
        "Checkr screening portal completed by professional. Report is processing.";
    } else if (eventType === "invitation.expired" || rawStatus === "expired") {
      invitationStatus = CHECKR_INVITATION_STATUS.EXPIRED;
      notes = "Checkr invitation expired. Please request a new screening link.";
    }

    const updateFields: Record<string, any> = {
      "backgroundCheck.invitationStatus": invitationStatus,
      "backgroundCheck.lastCheckedAt": new Date(),
      "backgroundCheck.notes": notes,
    };

    if (dataObj.report_id) {
      updateFields["backgroundCheck.checkrReportId"] = dataObj.report_id;
    }
    if (invitationStatus === CHECKR_INVITATION_STATUS.COMPLETED) {
      updateFields["backgroundCheck.status"] =
        CHECKR_VERIFICATION_STATUS.PENDING;
    }

    await User.findByIdAndUpdate(user._id, { $set: updateFields });
    return { processed: true, userId: user._id.toString(), invitationStatus };
  }

  // 2. Handle Report lifecycle events (criminal/background check)
  if (dataObj.object === "report" || eventType.startsWith("report.")) {
    const reportId = dataObj.id;
    const candidateId = dataObj.candidate_id;

    const user = await User.findOne({
      $or: [
        ...(reportId ? [{ "backgroundCheck.checkrReportId": reportId }] : []),
        ...(candidateId
          ? [{ "backgroundCheck.checkrCandidateId": candidateId }]
          : []),
      ],
    });

    if (!user) {
      return { processed: false, reason: "User not found for report event" };
    }

    const { mappedStatus, passed, rawResult, notes } =
      mapReportToVerificationState(dataObj);

    const updateData: Record<string, any> = {
      "backgroundCheck.checkrReportId": reportId,
      "backgroundCheck.status": mappedStatus,
      "backgroundCheck.passed": passed,
      "backgroundCheck.result": rawResult,
      "backgroundCheck.invitationStatus": CHECKR_INVITATION_STATUS.COMPLETED,
      "backgroundCheck.lastCheckedAt": new Date(),
      "backgroundCheck.notes": notes,
    };

    if (dataObj.package) {
      updateData["backgroundCheck.checkrPackage"] = dataObj.package;
    }

    if (mappedStatus === CHECKR_VERIFICATION_STATUS.VERIFIED) {
      updateData["backgroundCheck.verifiedAt"] = new Date();
      updateData.approvalStatus = APPROVAL_STATUS.APPROVED;
    }

    await User.findByIdAndUpdate(user._id, { $set: updateData });

    // Notify Professional
    let title = "Background Check Update";
    let text = `Your background check status is now ${mappedStatus}.`;

    if (mappedStatus === CHECKR_VERIFICATION_STATUS.VERIFIED) {
      title = "Background Check Clear";
      text =
        "Your Checkr background check passed! Your professional account is now verified.";
    } else if (mappedStatus === CHECKR_VERIFICATION_STATUS.REVIEW_REQUIRED) {
      title = "Background Check Under Review";
      text =
        "Your background check requires manual admin review before activation.";
    } else if (mappedStatus === CHECKR_VERIFICATION_STATUS.FAILED) {
      title = "Background Check Failed";
      text =
        "Your background check could not be completed. Please contact support.";
    }

    await sendNotifications({
      receiver: user._id.toString(),
      type: NOTIFICATION_TYPE.PROFESSIONAL,
      title,
      text,
      referenceId: user._id.toString(),
      referenceModel: "User",
    });

    // Notify Super Admin when review is required or failed
    if (
      mappedStatus === CHECKR_VERIFICATION_STATUS.REVIEW_REQUIRED ||
      mappedStatus === CHECKR_VERIFICATION_STATUS.FAILED
    ) {
      const superAdmin = await User.findOne({
        role: USER_ROLES.SUPER_ADMIN,
      }).select("_id");

      if (superAdmin) {
        await sendNotifications({
          receiver: superAdmin._id.toString(),
          type: NOTIFICATION_TYPE.ADMIN,
          title: "Professional Background Check Review Required",
          text: `Professional ${user.name} (${user.email}) background check status: ${mappedStatus}.`,
          referenceId: user._id.toString(),
          referenceModel: "User",
        });
      }
    }

    return {
      processed: true,
      userId: user._id.toString(),
      status: mappedStatus,
    };
  }

  return { processed: false, reason: `Unhandled event type: ${eventType}` };
};

export const CheckrService = {
  createCandidate,
  createInvitation,
  getInvitation,
  getReport,
  initiateBackgroundCheckForUser,
  startPreSignupScreening,
  getBackgroundCheckStatusFromDB,
  processWebhookEvent,
};
