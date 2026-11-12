import { model, Schema } from "mongoose";
import {
  MarqueeModel,
  MarqueeSettingModel,
  TMarquee,
  TMarqueeSetting,
} from "./marquee.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const marqueeSchema = new Schema<TMarquee>(
  {
    keyword: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

marqueeSchema.index({ keyword: 1 });
marqueeSchema.index({ order: 1 });

marqueeSchema.plugin(softDeletePlugin);

export const Marquee = model<TMarquee, MarqueeModel>("Marquee", marqueeSchema);

const marqueeSettingSchema = new Schema<TMarqueeSetting>(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const MarqueeSetting = model<TMarqueeSetting, MarqueeSettingModel>(
  "MarqueeSetting",
  marqueeSettingSchema,
);

