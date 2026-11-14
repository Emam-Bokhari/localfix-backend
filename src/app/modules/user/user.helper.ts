import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Category } from "../category/category.model";
import {
  TBusinessDayHours,
  TBusinessHours,
  TLiabilityInsurance,
  TTradeLicense,
} from "./user.interface";

/**
 * Parse boolean values sent via JSON or multipart/form-data strings.
 */
export const parseBooleanFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
};

/**
 * Parse service radius whether sent as number (25) or string ("25" / "Within 25 miles").
 */
export const parseServiceRadius = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      return isNaN(parsed) ? undefined : parsed;
    }
  }
  return undefined;
};

/**
 * Normalize trade license details from either nested `tradeLicense` object or flat fields.
 */
export const normalizeTradeLicense = (
  payload: Record<string, any>,
): TTradeLicense | undefined => {
  const nested =
    payload.tradeLicense && typeof payload.tradeLicense === "object"
      ? payload.tradeLicense
      : {};

  const licenseNumber = (
    nested.licenseNumber ||
    payload.licenseNumber ||
    ""
  ).trim();
  const state = (nested.state || payload.licenseState || payload.state || "")
    .trim()
    .toUpperCase();
  const certificateUrl =
    nested.certificateUrl ||
    payload.tradeLicenseCertificate ||
    (typeof payload.tradeLicense === "string" ? payload.tradeLicense : "") ||
    "";

  if (!licenseNumber && !state && !certificateUrl) {
    return undefined;
  }

  return {
    ...(licenseNumber && { licenseNumber }),
    ...(state && { state }),
    ...(certificateUrl && { certificateUrl }),
    isVerified: false,
  };
};

/**
 * Normalize liability insurance details from either nested `liabilityInsurance` or flat fields.
 */
export const normalizeLiabilityInsurance = (
  payload: Record<string, any>,
): TLiabilityInsurance | undefined => {
  const nested =
    payload.liabilityInsurance && typeof payload.liabilityInsurance === "object"
      ? payload.liabilityInsurance
      : {};

  const carrier = (
    nested.carrier ||
    payload.insuranceCarrier ||
    payload.carrier ||
    ""
  ).trim();
  const coverage = (
    nested.coverage ||
    payload.insuranceCoverage ||
    payload.coverage ||
    ""
  )
    .toString()
    .trim();
  const expires = (
    nested.expires ||
    nested.expiresAt ||
    payload.insuranceExpires ||
    payload.expires ||
    payload.expiresAt ||
    ""
  )
    .toString()
    .trim();
  const certificateUrl =
    nested.certificateUrl ||
    payload.coiCertificate ||
    payload.insuranceCertificate ||
    "";

  if (!carrier && !coverage && !expires && !certificateUrl) {
    return undefined;
  }

  return {
    ...(carrier && { carrier }),
    ...(coverage && { coverage }),
    ...(expires && { expires }),
    ...(certificateUrl && { certificateUrl }),
  };
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const mergeDayHours = (
  existing?: Partial<TBusinessDayHours>,
  incoming?: Partial<TBusinessDayHours>,
): TBusinessDayHours => ({
  isOpen:
    incoming?.isOpen !== undefined
      ? parseBooleanFlag(incoming.isOpen)
      : (existing?.isOpen ?? true),
  openTime: incoming?.openTime ?? existing?.openTime ?? "8:00 AM",
  closeTime: incoming?.closeTime ?? existing?.closeTime ?? "6:00 PM",
});

/**
 * Merge incoming businessHours updates with existing user businessHours.
 */
export const mergeBusinessHours = (
  existing: TBusinessHours | undefined,
  incoming: Record<string, any> | undefined,
  emergencyDispatchTopLevel?: unknown,
): TBusinessHours => {
  const days: NonNullable<TBusinessHours["days"]> = {};
  for (const day of DAY_KEYS) {
    days[day] = mergeDayHours(existing?.days?.[day], incoming?.days?.[day]);
  }

  const emergencyDispatchAvailable =
    emergencyDispatchTopLevel !== undefined
      ? parseBooleanFlag(emergencyDispatchTopLevel)
      : incoming?.emergencyDispatchAvailable !== undefined
        ? parseBooleanFlag(incoming.emergencyDispatchAvailable)
        : (existing?.emergencyDispatchAvailable ?? false);

  return {
    mode: incoming?.mode ?? existing?.mode ?? "all_days",
    allDays: mergeDayHours(existing?.allDays, incoming?.allDays),
    days,
    emergencyDispatchAvailable,
  };
};

/**
 * Ensure the selected trade category ID exists and is not deleted.
 */
export const validateCategoryExists = async (categoryId: string) => {
  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: { $ne: true },
  }).lean();

  if (!category) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Selected primary trade category does not exist",
    );
  }

  return category;
};
