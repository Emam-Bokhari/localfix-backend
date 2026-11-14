import { Schema, model } from "mongoose";
import { IFavorite } from "./favorite.interface";

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

favoriteSchema.index({ userId: 1, referenceId: 1 }, { unique: true });
favoriteSchema.index({ referenceId: 1 });

export const Favorite = model<IFavorite>("Favorite", favoriteSchema);
