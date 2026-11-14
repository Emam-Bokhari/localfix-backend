import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export type IService = {
  professional: Types.ObjectId;
  name: string;
  category: Types.ObjectId;
  description: string;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type IServiceModel = ISoftDeleteModel<IService>;
