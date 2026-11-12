import { Model, Types } from "mongoose";
import { GENDER, STATUS, USER_ROLES } from "../../../enums/user";
import { ISoftDeleteModel } from "../../../types/softDelete";
import { PRIMARY_TRADE } from "./user.constant";

export type TCertificate = {
  certificateName?: string;
  certificateAttachment?: string;
};

export type IUser = {
  name: string;
  role: USER_ROLES;
  email: string;
  profileImage?: string;
  password?: string;
  verified: boolean;
  phone?: string;
  countryCode?: string;
  status: STATUS;
  about?:string;
  serviceRadiusInMiles?:number;
  yearsOfExperience?:string;
  category?:Types.ObjectId;
  firebaseUid?: string;
  gender?: GENDER;
  deviceToken?: string;
  state?:string;
  city?:string;
  zipCode?:string;
    location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude],
    address: string;
  };
  timezone?: string;
  dateOfBirth?: string | Date;
  companyName?: string;
  authentication?: {
    isResetPassword?: boolean;
    oneTimeCode?: number | null;
    expireAt?: Date | null;
    authType?: string | null;
  };
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserModal = {
  isExistUserById(id: string): Promise<IUser | null>;
  isExistUserByEmail(email: string): Promise<IUser | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
} & Model<IUser>;

export type IUserModel = ISoftDeleteModel<IUser> & UserModal;
