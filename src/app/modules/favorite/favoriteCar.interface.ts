import { Types, Document } from "mongoose";

export interface TFavoriteCar extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
}
