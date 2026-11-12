import { USER_ROLES } from "../enums/user";

export type ISignUpData = {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: USER_ROLES;
  phone?: string;
  countryCode?: string;
  zipCode?: string;
  agreedToTerms?: boolean | string;
  // Professional fields
  companyName?: string;
  businessName?: string;
  category?: string;
  serviceRadiusInMiles?: number | string;
  state?: string;
  licenseNumber?: string;
  licenseState?: string;
  tradeLicenseCertificate?: string;
  tradeLicense?: {
    licenseNumber?: string;
    state?: string;
    certificateUrl?: string;
  };
  insuranceCarrier?: string;
  insuranceCoverage?: string;
  coiCertificate?: string;
  liabilityInsurance?: {
    carrier?: string;
    coverage?: string;
    certificateUrl?: string;
  };
  backgroundCheckConsent?: boolean | string;
  checkrCandidateId?: string;
  checkrInvitationId?: string;
  checkrInvitationUrl?: string;
  profileImage?: string;
  fcmToken?: string;
  deviceId?: string;
  deviceType?: "ios" | "android" | "web";
};

export type IVerifyEmail = {
  email: string;
  oneTimeCode: number;
};

export type ILoginData = {
  email?: string;
  phone?: string;
  password?: string;
  fcmToken?: string;
  deviceId?: string;
  deviceType?: "ios" | "android" | "web";
};

export type IAuthResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export type IChangePassword = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};
