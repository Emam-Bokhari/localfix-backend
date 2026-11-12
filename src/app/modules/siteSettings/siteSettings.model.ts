import { model, Schema } from "mongoose";
import { SiteSettingsModel, TSiteSettings } from "./siteSettings.interface";

const siteSettingsSchema = new Schema<TSiteSettings>(
  {
    platformBrandName: {
      type: String,
      required: true,
      trim: true,
    },
    headerLogo: {
      type: String,
      trim: true,
    },
    footerLogo: {
      type: String,
      trim: true,
    },
    favicon: {
      type: String,
      trim: true,
    },
    supportEmail: {
      type: String,
      required: true,
      trim: true,
    },
    supportPhone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    facebookUrl: {
      type: String,
      trim: true,
    },
    instagramUrl: {
      type: String,
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SiteSettings = model<TSiteSettings, SiteSettingsModel>(
  "SiteSettings",
  siteSettingsSchema,
);

