import { model, Schema } from "mongoose";
import { TBanner, BannerModel } from "./banner.interface";

const bannerSchema = new Schema<TBanner>(
  {
    headline: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Banner = model<TBanner, BannerModel>("Banner", bannerSchema);
