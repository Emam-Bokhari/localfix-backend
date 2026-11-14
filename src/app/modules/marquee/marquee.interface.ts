import { Model } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export type TMarquee = {
  keyword: string;
  isEnabled: boolean;
  order?: number;
};

export type MarqueeModel = ISoftDeleteModel<TMarquee>;

export type TMarqueeSetting = {
  isEnabled: boolean;
};

export type MarqueeSettingModel = Model<TMarqueeSetting>;
