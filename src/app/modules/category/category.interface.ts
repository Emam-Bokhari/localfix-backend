import { ISoftDeleteModel } from "../../../types/softDelete";

export type ICategory = {
  name: string;
  coverImage?: string;
  icon?: string;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ICategoryModel = ISoftDeleteModel<ICategory>;

