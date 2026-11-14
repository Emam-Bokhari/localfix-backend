import { model, Schema, Query } from "mongoose";
import { IPackage, PackageModel } from "./package.interface";

const packageSchema = new Schema<IPackage, PackageModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
      required: true,
    },
    features: {
      type: [String],
      default: [],
    },
    leadLimit: {
      type: Number,
      required: true,
      default: -1, // -1 means Unlimited
    },
    hasTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    stripeProductId: {
      type: String,
    },
    stripePriceId: {
      type: String,
    },
    stripeMonthlyPriceId: {
      type: String,
    },
    stripeYearlyPriceId: {
      type: String,
    },
    monthlyPrice: {
      type: Number,
    },
    yearlyPrice: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

packageSchema.pre("find", function (this: Query<any, any>, next) {
  this.find({ isDeleted: { $ne: true } } as any);
  next();
});

packageSchema.pre("findOne", function (this: Query<any, any>, next) {
  this.find({ isDeleted: { $ne: true } } as any);
  next();
});

export const Package = model<IPackage, PackageModel>("Package", packageSchema);
