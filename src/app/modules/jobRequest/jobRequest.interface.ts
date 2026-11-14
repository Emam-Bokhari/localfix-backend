import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { JOB_REQUEST_STATUS } from "../../../enums/jobRequest";

export type IServiceLocation = {
  zipCode: string;
  address?: string;
  city?: string;
  state?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
    address?: string;
  };
};

export type IJobRequest = {
  homeowner: Types.ObjectId;
  category: Types.ObjectId;
  headline: string;
  title?: string;
  description: string;
  projectPhotos?: string[];
  timeframe: string;
  serviceLocation: IServiceLocation;
  preferredArrivalWindow?: string;
  propertyType: string;
  partsAndMaterials: string;
  estimatedBudget?: number;
  professional?: Types.ObjectId | null;
  status: JOB_REQUEST_STATUS;
  quotesCount?: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type IJobRequestModel = ISoftDeleteModel<IJobRequest>;

