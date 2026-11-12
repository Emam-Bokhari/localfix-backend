import { model, Schema } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
import { IUser, IUserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../../config";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

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
      minlength: 8,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
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
    companyName: {
      type: String,
      required: false,
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
userSchema.index({ location: "2dsphere" });

export const User = model<IUser, IUserModel>("User", userSchema);
