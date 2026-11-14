import { model, Schema } from "mongoose";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { IService, IServiceModel } from "./service.interface";

const serviceSchema = new Schema<IService, IServiceModel>(
  {
    professional: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

serviceSchema.plugin(softDeletePlugin);

serviceSchema.index(
  { professional: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const Service = model<IService, IServiceModel>("Service", serviceSchema);
