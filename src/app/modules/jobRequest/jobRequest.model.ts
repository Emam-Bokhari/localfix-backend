import { model, Schema } from "mongoose";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { JOB_REQUEST_STATUS } from "../../../enums/jobRequest";
import { IJobRequest, IJobRequestModel } from "./jobRequest.interface";

const serviceLocationSchema = new Schema(
  {
    zipCode: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
      address: {
        type: String,
        default: "",
      },
    },
  },
  { _id: false },
);

const jobRequestSchema = new Schema<IJobRequest, IJobRequestModel>(
  {
    homeowner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    projectPhotos: {
      type: [String],
      default: [],
    },
    timeframe: {
      type: String,
      required: true,
      trim: true,
    },
    serviceLocation: {
      type: serviceLocationSchema,
      required: true,
    },
    preferredArrivalWindow: {
      type: String,
      trim: true,
      default: "Anytime (Flexible arrival)",
    },
    propertyType: {
      type: String,
      required: true,
      trim: true,
    },
    partsAndMaterials: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedBudget: {
      type: Number,
      default: 0,
    },
    professional: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(JOB_REQUEST_STATUS),
      default: JOB_REQUEST_STATUS.AWAITING_QUOTES,
      index: true,
    },
    quotesCount: {
      type: Number,
      default: 0,
    },
    rejectedBy: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    isUrgent: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

jobRequestSchema.pre("save", function (next) {
  if (this.headline && !this.title) {
    this.title = this.headline;
  } else if (this.title && !this.headline) {
    this.headline = this.title;
  }
  if (this.timeframe) {
    this.isUrgent = /urgent|asap|emergency/i.test(this.timeframe);
  }
  next();
});

jobRequestSchema.plugin(softDeletePlugin);

jobRequestSchema.index({ homeowner: 1, createdAt: -1 });
jobRequestSchema.index({ category: 1, status: 1 });
jobRequestSchema.index({ professional: 1, status: 1 });
jobRequestSchema.index({ "serviceLocation.zipCode": 1 });
jobRequestSchema.index({ rejectedBy: 1 });
jobRequestSchema.index({ isUrgent: -1, createdAt: -1 });
jobRequestSchema.index({ estimatedBudget: -1, createdAt: -1 });

export const JobRequest = model<IJobRequest, IJobRequestModel>(
  "JobRequest",
  jobRequestSchema,
);
