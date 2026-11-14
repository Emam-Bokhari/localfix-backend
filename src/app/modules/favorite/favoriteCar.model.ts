import { Schema, model } from "mongoose";
import { TFavoriteCar } from "./favoriteCar.interface";

const favoriteCarSchema = new Schema<TFavoriteCar>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Car",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const FavoriteCar = model<TFavoriteCar>(
  "FavoriteCar",
  favoriteCarSchema,
);
