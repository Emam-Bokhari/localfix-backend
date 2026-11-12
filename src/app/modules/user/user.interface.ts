import { Model, Types } from "mongoose";
import {
  APPROVAL_STATUS,
  CHECKR_INVITATION_STATUS,
  CHECKR_VERIFICATION_STATUS,
  GENDER,
  STATUS,
  USER_ROLES,
} from "../../../enums/user";
import { ISoftDeleteModel } from "../../../types/softDelete";

export type TCertificate = {
  certificateName?: string;
  certificateAttachment?: string;
};

export type TTradeLicense = {
  licenseNumber?: string;
  state?: string;
  certificateUrl?: string;
  isVerified?: boolean;
};

export type TLiabilityInsurance = {
  carrier?: string;
  coverage?: string;
  certificateUrl?: string;
};

export type TBackgroundCheck = {
  consentAccepted?: boolean;
  consentAcceptedAt?: Date | null;
  status?: CHECKR_VERIFICATION_STATUS;
  passed?: boolean;
  checkrCandidateId?: string;
  checkrInvitationId?: string;
  checkrInvitationUrl?: string;
  invitationStatus?: CHECKR_INVITATION_STATUS;
  checkrReportId?: string;
  checkrPackage?: string;
  result?: string | null;
  verifiedAt?: Date | null;
  lastCheckedAt?: Date | null;
  notes?: string;
};

export type IUser = {
  name: string;
  role: USER_ROLES;
  email: string;
  profileImage?: string;
  password?: string;
  verified: boolean;
  phone?: string;
  countryCode?: string;
  status: STATUS;
  approvalStatus?: APPROVAL_STATUS;
  agreedToTerms?: boolean;
  termsAcceptedAt?: Date | null;
  about?: string;
  serviceRadiusInMiles?: number;
  yearsOfExperience?: string;
  category?: Types.ObjectId;
  firebaseUid?: string;
  gender?: GENDER;
  deviceToken?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
  };
  timezone?: string;
  dateOfBirth?: string | Date;
  companyName?: string;
  tradeLicense?: TTradeLicense;
  liabilityInsurance?: TLiabilityInsurance;
  backgroundCheck?: TBackgroundCheck;
  authentication?: {
    isResetPassword?: boolean;
    oneTimeCode?: number | null;
    expireAt?: Date | null;
    authType?: string | null;
  };
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserModal = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
} & Model<IUser>;

export type IUserModel = ISoftDeleteModel<IUser> & UserModal;
