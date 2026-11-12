import { Model } from "mongoose";

export type TBanner = {
  headline: string;
  description: string;
  image: string;
};

export type BannerModel = Model<TBanner>;