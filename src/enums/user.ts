export enum USER_ROLES {
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  HOME_OWNER = "home_owner",
  PROFESSIONAL = "professional",
}

export enum GENDER {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export enum STATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum APPROVAL_STATUS {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum CHECKR_VERIFICATION_STATUS {
  NOT_STARTED = "not_started",
  PENDING = "pending",
  VERIFIED = "verified",
  REVIEW_REQUIRED = "review_required",
  FAILED = "failed",
}

export enum CHECKR_INVITATION_STATUS {
  NOT_SENT = "not_sent",
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
}
