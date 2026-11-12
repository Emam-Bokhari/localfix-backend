export enum NOTIFICATION_TYPE {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  HOME_OWNER = "home_owner",
  PROFESSIONAL = "professional",
  LANDLORD = "landlord",
  TENANT = "tenant",
  CONTRACTOR = "contractor",

  // Specific event notifications
  RENT_REMINDER = "rent_reminder",
  MAINTENANCE_UPDATE = "maintenance_update",
  COMPLIANCE_ALERT = "compliance_alert",
  JOB_UPDATE = "job_update",
  MESSAGE_NEW = "message_new",

  // Additional notifications
  SUBSCRIPTION_UPDATE = "subscription_update",
  ADVERTISEMENT_UPDATE = "advertisement_update",
  REVIEW_UPDATE = "review_update",
  BROADCAST = "broadcast",
  ANNOUNCEMENT = "announcement",
}
