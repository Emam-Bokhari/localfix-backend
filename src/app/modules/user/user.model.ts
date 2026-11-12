import { model, Schema } from "mongoose";
import {
  APPROVAL_STATUS,
  CHECKR_INVITATION_STATUS,
  CHECKR_VERIFICATION_STATUS,
  GENDER,
  STATUS,
  USER_ROLES,
} from "../../../enums/user";
import { IUser, IUserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../../config";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const businessDayHoursSchema = new Schema(
  {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: "8:00 AM", trim: true },
    closeTime: { type: String, default: "6:00 PM", trim: true },
  },
  { _id: false },
);

const projectPhotoSchema = new Schema(
  {
    image: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const userSchema = new Schema<IUser, IUserModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.HOME_OWNER,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    profileImage: {
      type: String,
      required: false,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      enum: Object.values(GENDER),
      default: GENDER.MALE,
    },
    password: {
      type: String,
      required: false,
      select: 0,
      minlength: 6,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(APPROVAL_STATUS),
      default: APPROVAL_STATUS.APPROVED,
    },
    agreedToTerms: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    about: {
      type: String,
      required: false,
      trim: true,
    },
    serviceRadiusInMiles: {
      type: Number,
      required: false,
    },
    yearsOfExperience: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      default: null,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    countryCode: {
      type: String,
      required: false,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
    deviceToken: {
      type: String,
      required: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    state: {
      type: String,
      required: false,
      trim: true,
    },
    city: {
      type: String,
      required: false,
      trim: true,
    },
    zipCode: {
      type: String,
      required: false,
      trim: true,
    },
    streetAddress: {
      type: String,
      required: false,
      trim: true,
    },
    companyName: {
      type: String,
      required: false,
      trim: true,
    },
    tradeLicense: {
      licenseNumber: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      certificateUrl: {
        type: String,
        default: "",
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
    liabilityInsurance: {
      carrier: {
        type: String,
        trim: true,
      },
      coverage: {
        type: String,
        trim: true,
      },
      expires: {
        type: String,
        trim: true,
      },
      certificateUrl: {
        type: String,
        default: "",
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    },
    businessHours: {
      mode: {
        type: String,
        enum: ["all_days", "customize"],
        default: "all_days",
      },
      allDays: {
        type: businessDayHoursSchema,
        default: () => ({
          isOpen: true,
          openTime: "8:00 AM",
          closeTime: "6:00 PM",
        }),
      },
      days: {
        monday: { type: businessDayHoursSchema, default: () => ({}) },
        tuesday: { type: businessDayHoursSchema, default: () => ({}) },
        wednesday: { type: businessDayHoursSchema, default: () => ({}) },
        thursday: { type: businessDayHoursSchema, default: () => ({}) },
        friday: { type: businessDayHoursSchema, default: () => ({}) },
        saturday: { type: businessDayHoursSchema, default: () => ({}) },
        sunday: { type: businessDayHoursSchema, default: () => ({}) },
      },
      emergencyDispatchAvailable: {
        type: Boolean,
        default: false,
      },
    },
    acceptedPayments: {
      type: [String],
      default: [],
    },
    projectPhotos: {
      type: [projectPhotoSchema],
      default: [],
    },
    backgroundCheck: {
      consentAccepted: {
        type: Boolean,
        default: false,
      },
      consentAcceptedAt: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: Object.values(CHECKR_VERIFICATION_STATUS),
        default: CHECKR_VERIFICATION_STATUS.NOT_STARTED,
      },
      passed: {
        type: Boolean,
        default: false,
      },
      checkrCandidateId: {
        type: String,
        index: true,
        sparse: true,
      },
      checkrInvitationId: {
        type: String,
        index: true,
        sparse: true,
      },
      checkrInvitationUrl: {
        type: String,
        default: "",
      },
      invitationStatus: {
        type: String,
        enum: Object.values(CHECKR_INVITATION_STATUS),
        default: CHECKR_INVITATION_STATUS.NOT_SENT,
      },
      checkrReportId: {
        type: String,
        index: true,
        sparse: true,
      },
      checkrPackage: {
        type: String,
      },
      result: {
        type: String,
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      lastCheckedAt: {
        type: Date,
        default: null,
      },
      notes: {
        type: String,
      },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: {
        type: String,
        default: "",
      },
    },
    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
        authType: {
          type: String,
          default: null,
        },
      },
      select: 0,
    },
    timezone: {
      type: String,
      default: "Asia/Dhaka",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.id;
        delete ret.password;
        delete ret.authentication;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.id;
        delete ret.password;
        delete ret.authentication;
        return ret;
      },
    },
  },
);

/* ================= PLUGIN ================= */
userSchema.plugin(softDeletePlugin);

// exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  return await User.findById(id);
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  return await User.findOne({ email });
};

// is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

// hash password pre-save
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    );
  }
  next();
});

userSchema.index({ role: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ category: 1, role: 1 });
userSchema.index({ location: "2dsphere" });

export const User = model<IUser, IUserModel>("User", userSchema);
