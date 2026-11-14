import { Model } from "mongoose";

export type TSiteSettings = {
  platformBrandName: string;
  headerLogo?: string;
  footerLogo?: string;
  favicon?: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
};

export type SiteSettingsModel = Model<TSiteSettings>;
