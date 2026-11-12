import { APPROVAL_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload } from "jsonwebtoken";
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import unlinkFile from "../../../shared/unlinkFile";
import QueryBuilder from "../../builder/queryBuilder";
import bcrypt from "bcrypt";
import { USER_SEARCHABLE_FIELDS } from "./user.constant";
import { AuthService } from "../auth/auth.service";
import { ISignUpData } from "../../../types/auth";
import {
  normalizeLiabilityInsurance,
  normalizeTradeLicense,
  parseServiceRadius,
  validateCategoryExists,
} from "./user.helper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

// --- ADMIN SERVICES ---
const createAdminToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const normalizedEmail = payload.email?.trim().toLowerCase();
  const isExistAdmin = await User.findOne({ email: normalizedEmail });
  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This email is already taken");
  }

  const adminPayload = {
    ...payload,
    email: normalizedEmail,
    verified: true,
    status: STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
    role: payload.role || USER_ROLES.ADMIN,
  };

  const createAdmin = await User.create(adminPayload);
  return createAdmin;
};

const getAdminFromDB = async (query: any) => {
  const baseQuery = User.find({
    role: { $in: [USER_ROLES.ADMIN] },
  }).select(
    "name email role profileImage phone countryCode status createdAt updatedAt",
  );

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(["name", "email", "phone"])
    .filter()
    .sort()
    .fields()
    .paginate();

  const [admins, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  return {
    data: admins,
    meta,
  };
};

const getSuperAdminFromDB = async () => {
  const result = await User.findOne({
    role: USER_ROLES.SUPER_ADMIN,
  }).select("-password -authentication -deviceToken");

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Super admin not found");
  }

  return result;
};

const updateAdminStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Status must be either 'active' or 'inactive'",
    );
  }

  const user = await User.findOne({
    _id: id,
    role: USER_ROLES.ADMIN,
  });
  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No admin is found by this user ID",
    );
  }

  const result = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!result) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to change status by this user ID",
    );
  }

  return result;
};

const deleteAdminFromDB = async (id: any) => {
  const isExistAdmin = await User.softDeleteById(id);

  if (!isExistAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete Admin");
  }

  return isExistAdmin;
};

// --- USER SERVICES ---
const createUserToDB = async (payload: ISignUpData) => {
  return await AuthService.signUpUserToDB(payload);
};

const getMyProfileFromDB = async (userId: string) => {
  const result = await User.findById(userId)
    .populate("category", "name icon coverImage")
    .select("-password -authentication");

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return result;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Record<string, any>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const updatePayload: Record<string, any> = { ...payload };

  // Prevent overwriting sensitive system fields via profile update
  delete updatePayload.role;
  delete updatePayload.verified;
  delete updatePayload.status;
  delete updatePayload.approvalStatus;
  delete updatePayload.backgroundCheck;

  // Unlink old profile image if changed
  if (updatePayload.profileImage && isExistUser.profileImage) {
    unlinkFile(isExistUser.profileImage);
  }

  // Alias businessName -> companyName
  if (updatePayload.businessName && !updatePayload.companyName) {
    updatePayload.companyName = updatePayload.businessName.trim();
  }
  delete updatePayload.businessName;

  // Validate category if provided
  if (updatePayload.category) {
    await validateCategoryExists(updatePayload.category.toString());
  }

  // Parse service radius if provided
  if (updatePayload.serviceRadiusInMiles !== undefined) {
    const parsedRadius = parseServiceRadius(updatePayload.serviceRadiusInMiles);
    if (parsedRadius !== undefined) {
      updatePayload.serviceRadiusInMiles = parsedRadius;
    } else {
      delete updatePayload.serviceRadiusInMiles;
    }
  }

  // Merge tradeLicense updates cleanly
  const normalizedLicense = normalizeTradeLicense(updatePayload);
  if (normalizedLicense) {
    if (
      normalizedLicense.certificateUrl &&
      isExistUser.tradeLicense?.certificateUrl
    ) {
      unlinkFile(isExistUser.tradeLicense.certificateUrl);
    }
    updatePayload.tradeLicense = {
      licenseNumber:
        normalizedLicense.licenseNumber ||
        isExistUser.tradeLicense?.licenseNumber,
      state: normalizedLicense.state || isExistUser.tradeLicense?.state,
      certificateUrl:
        normalizedLicense.certificateUrl ||
        isExistUser.tradeLicense?.certificateUrl ||
        "",
      isVerified: isExistUser.tradeLicense?.isVerified ?? false,
    };
  }
  delete updatePayload.licenseNumber;
  delete updatePayload.licenseState;
  delete updatePayload.tradeLicenseCertificate;

  // Merge liabilityInsurance updates cleanly
  const normalizedInsurance = normalizeLiabilityInsurance(updatePayload);
  if (normalizedInsurance) {
    if (
      normalizedInsurance.certificateUrl &&
      isExistUser.liabilityInsurance?.certificateUrl
    ) {
      unlinkFile(isExistUser.liabilityInsurance.certificateUrl);
    }
    updatePayload.liabilityInsurance = {
      carrier:
        normalizedInsurance.carrier || isExistUser.liabilityInsurance?.carrier,
      coverage:
        normalizedInsurance.coverage ||
        isExistUser.liabilityInsurance?.coverage,
      certificateUrl:
        normalizedInsurance.certificateUrl ||
        isExistUser.liabilityInsurance?.certificateUrl ||
        "",
    };
  }
  delete updatePayload.insuranceCarrier;
  delete updatePayload.insuranceCoverage;
  delete updatePayload.coiCertificate;
  delete updatePayload.insuranceCertificate;
  delete updatePayload.carrier;
  delete updatePayload.coverage;

  const updateDoc = await User.findOneAndUpdate({ _id: id }, updatePayload, {
    new: true,
  })
    .populate("category", "name icon coverImage")
    .select("-password -authentication");

  return updateDoc;
};

const getUsersFromDB = async (query: Record<string, unknown>) => {
  const roleFilter = query.role
    ? { role: query.role }
    : { role: { $in: [USER_ROLES.HOME_OWNER, USER_ROLES.PROFESSIONAL] } };

  const baseQuery = User.find(roleFilter)
    .populate("category", "name icon coverImage")
    .select("-password -authentication -deviceToken");

  const queryBuilder = new QueryBuilder<IUser>(baseQuery, query)
    .search(USER_SEARCHABLE_FIELDS)
    .filter()
    .sort()
    .fields()
    .paginate();

  const [users, meta] = await Promise.all([
    queryBuilder.modelQuery.lean(),
    queryBuilder.countTotal(),
  ]);

  return {
    data: users,
    meta,
  };
};

const getUserByIdFromDB = async (id: string) => {
  const user = await User.findById(id)
    .populate("category", "name icon coverImage")
    .select("-password -authentication -deviceToken");

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No user is found by this ID");
  }

  return user;
};

const updateUserStatusByIdToDB = async (
  id: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
) => {
  if (![STATUS.ACTIVE, STATUS.INACTIVE].includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Status must be either 'active' or 'inactive'",
    );
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No user is found by this ID");
  }

  const result = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  ).select("-password -authentication");

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update status");
  }

  return result;
};

const updateApprovalStatusByIdToDB = async (
  id: string,
  approvalStatus: APPROVAL_STATUS,
) => {
  if (!Object.values(APPROVAL_STATUS).includes(approvalStatus)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Approval status must be 'pending', 'approved', or 'rejected'",
    );
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No user is found by this ID");
  }

  const updateFields: Record<string, any> = { approvalStatus };
  if (approvalStatus === APPROVAL_STATUS.APPROVED && user.tradeLicense) {
    updateFields["tradeLicense.isVerified"] = true;
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true },
  )
    .populate("category", "name icon coverImage")
    .select("-password -authentication");

  if (user.role === USER_ROLES.PROFESSIONAL) {
    await sendNotifications({
      receiver: user._id.toString(),
      type: NOTIFICATION_TYPE.PROFESSIONAL,
      title:
        approvalStatus === APPROVAL_STATUS.APPROVED
          ? "Application Approved"
          : "Application Status Update",
      text:
        approvalStatus === APPROVAL_STATUS.APPROVED
          ? "Your professional application has been approved. You can now receive local service jobs."
          : `Your professional application status has been updated to ${approvalStatus}.`,
      referenceId: user._id.toString(),
      referenceModel: "User",
    });
  }

  return result;
};

const deleteUserByIdFromD = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User does not exist");
  }

  const result = await User.softDeleteById(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete user");
  }

  return result;
};

const deleteProfileFromDB = async (id: string, password?: string) => {
  const user = await User.findById(id).select("+password");
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (user.password && password) {
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Password is incorrect!");
    }
  }

  const result = await User.softDeleteById(id);
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to delete profile");
  }

  return result;
};

export const UserService = {
  createUserToDB,
  getUsersFromDB,
  getAdminFromDB,
  getSuperAdminFromDB,
  deleteAdminFromDB,
  getUserByIdFromDB,
  getMyProfileFromDB,
  updateProfileToDB,
  createAdminToDB,
  updateUserStatusByIdToDB,
  updateApprovalStatusByIdToDB,
  updateAdminStatusByIdToDB,
  deleteUserByIdFromD,
  deleteProfileFromDB,
};
