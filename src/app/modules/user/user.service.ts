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
  mergeBusinessHours,
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

  // Sync streetAddress <-> location.address while preserving coordinates
  const incomingStreetAddress =
    updatePayload.streetAddress?.trim() ||
    updatePayload.address?.trim() ||
    updatePayload.location?.address?.trim();
  delete updatePayload.address;

  if (incomingStreetAddress !== undefined || updatePayload.location) {
    const existingLocation = isExistUser.location || {
      type: "Point" as const,
      coordinates: [0, 0] as [number, number],
      address: "",
    };
    const nextAddress =
      incomingStreetAddress ?? existingLocation.address ?? "";
    if (incomingStreetAddress !== undefined) {
      updatePayload.streetAddress = incomingStreetAddress;
    }
    updatePayload.location = {
      type: updatePayload.location?.type || existingLocation.type || "Point",
      coordinates:
        updatePayload.location?.coordinates ||
        existingLocation.coordinates || [0, 0],
      address: nextAddress,
    };
  }

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
      expires:
        normalizedInsurance.expires || isExistUser.liabilityInsurance?.expires,
      certificateUrl:
        normalizedInsurance.certificateUrl ||
        isExistUser.liabilityInsurance?.certificateUrl ||
        "",
      isVerified: isExistUser.liabilityInsurance?.isVerified ?? false,
    };
  }
  delete updatePayload.insuranceCarrier;
  delete updatePayload.insuranceCoverage;
  delete updatePayload.insuranceExpires;
  delete updatePayload.expires;
  delete updatePayload.expiresAt;
  delete updatePayload.coiCertificate;
  delete updatePayload.insuranceCertificate;
  delete updatePayload.carrier;
  delete updatePayload.coverage;

  // Professional-only profile fields: businessHours, acceptedPayments, projectPhotos
  if (isExistUser.role === USER_ROLES.PROFESSIONAL) {
    if (
      updatePayload.businessHours !== undefined ||
      updatePayload.emergencyDispatchAvailable !== undefined
    ) {
      updatePayload.businessHours = mergeBusinessHours(
        isExistUser.businessHours,
        updatePayload.businessHours,
        updatePayload.emergencyDispatchAvailable,
      );
    }

    if (Array.isArray(updatePayload.acceptedPayments)) {
      updatePayload.acceptedPayments = Array.from(
        new Set(
          updatePayload.acceptedPayments
            .map((method: string) => method.trim())
            .filter(Boolean),
        ),
      );
    }
  } else {
    delete updatePayload.businessHours;
    delete updatePayload.acceptedPayments;
    delete updatePayload.projectPhotos;
  }
  delete updatePayload.emergencyDispatchAvailable;

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
  if (approvalStatus === APPROVAL_STATUS.APPROVED && user.liabilityInsurance) {
    updateFields["liabilityInsurance.isVerified"] = true;
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

const addProjectPhotoToDB = async (
  userId: string,
  payload: {
    image?: string;
    projectPhoto?: string;
    title: string;
    category: string;
  },
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (user.role !== USER_ROLES.PROFESSIONAL) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only professionals can manage project photos",
    );
  }

  const imageUrl = (payload.projectPhoto || payload.image || "").trim();
  if (!imageUrl) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Project photo image is required");
  }

  user.projectPhotos = user.projectPhotos || [];
  user.projectPhotos.push({
    image: imageUrl,
    title: payload.title.trim(),
    category: payload.category.trim(),
    createdAt: new Date(),
  });

  await user.save();
  return user.projectPhotos;
};

const updateProjectPhotoToDB = async (
  userId: string,
  photoId: string,
  payload: {
    image?: string;
    projectPhoto?: string;
    title?: string;
    category?: string;
  },
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (user.role !== USER_ROLES.PROFESSIONAL) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only professionals can manage project photos",
    );
  }

  const photo = (user.projectPhotos as any)?.id?.(photoId) ||
    user.projectPhotos?.find((p) => p._id?.toString() === photoId);

  if (!photo) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Project photo not found");
  }

  const newImage = (payload.projectPhoto || payload.image || "").trim();
  if (newImage) {
    if (photo.image) {
      unlinkFile(photo.image);
    }
    photo.image = newImage;
  }
  if (payload.title !== undefined) {
    photo.title = payload.title.trim();
  }
  if (payload.category !== undefined) {
    photo.category = payload.category.trim();
  }

  await user.save();
  return user.projectPhotos;
};

const deleteProjectPhotoFromDB = async (userId: string, photoId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (user.role !== USER_ROLES.PROFESSIONAL) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Only professionals can manage project photos",
    );
  }

  const photoIndex =
    user.projectPhotos?.findIndex((p) => p._id?.toString() === photoId) ?? -1;
  if (photoIndex === -1 || !user.projectPhotos) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Project photo not found");
  }

  const [removed] = user.projectPhotos.splice(photoIndex, 1);
  if (removed?.image) {
    unlinkFile(removed.image);
  }

  await user.save();
  return user.projectPhotos;
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
  addProjectPhotoToDB,
  updateProjectPhotoToDB,
  deleteProjectPhotoFromDB,
};
