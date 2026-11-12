import { model, Schema } from "mongoose";
import { ICategory, ICategoryModel } from "./category.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const categorySchema = new Schema<ICategory, ICategoryModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    coverImage: {
      type: String,
      required: false,
      default: "",
    },
    icon: {
      type: String,
      required: false,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

categorySchema.plugin(softDeletePlugin);

categorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const Category = model<ICategory, ICategoryModel>(
  "Category",
  categorySchema,
);

