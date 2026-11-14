import { Document, Types } from "mongoose";

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  referenceId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

