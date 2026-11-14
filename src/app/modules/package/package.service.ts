import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { IPackage } from "./package.interface";
import { Package } from "./package.model";

const createPackageIntoDB = async (payload: IPackage): Promise<IPackage> => {
  const isExist = await Package.findOne({
    name: { $regex: new RegExp(`^${payload.name}$`, "i") },
    isDeleted: { $ne: true },
  });

  if (isExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "A package with this name already exists",
    );
  }

  // Sync trial fields
  if (payload.trialDays && payload.trialDays > 0) {
    payload.hasTrial = true;
  } else if (!payload.hasTrial) {
    payload.trialDays = 0;
  }

  // Ensure backward compatibility fields for price
  if (payload.price !== undefined) {
    if (payload.monthlyPrice === undefined) {
      payload.monthlyPrice = payload.price;
    }
    if (payload.yearlyPrice === undefined) {
      payload.yearlyPrice =
        payload.billingCycle === "yearly"
          ? payload.price
          : payload.price * 10; // Standard 2-month discount default
    }
  }

  const result = await Package.create(payload);
  return result;
};

const getAllPackagesFromDB = async (query: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = {
    isDeleted: { $ne: true },
  };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  if (query.billingCycle) {
    filter.billingCycle = query.billingCycle;
  }

  if (query.searchTerm) {
    filter.$or = [
      { name: { $regex: query.searchTerm as string, $options: "i" } },
      { description: { $regex: query.searchTerm as string, $options: "i" } },
    ];
  }

  const result = await Package.find(filter).sort({ price: 1 });
  return result;
};

const getPackageByIdFromDB = async (id: string): Promise<IPackage | null> => {
  const result = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
  }
  return result;
};

const updatePackageIntoDB = async (
  id: string,
  payload: Partial<IPackage>,
): Promise<IPackage | null> => {
  const isExist = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
  }

  // If name is changing, check uniqueness
  if (payload.name && payload.name.toLowerCase() !== isExist.name.toLowerCase()) {
    const duplicate = await Package.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${payload.name}$`, "i") },
      isDeleted: { $ne: true },
    });
    if (duplicate) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Another package with this name already exists",
      );
    }
  }

  // Handle trial period logic when updated
  if (payload.trialDays !== undefined) {
    if (payload.trialDays > 0) {
      payload.hasTrial = true;
    } else {
      payload.hasTrial = false;
      payload.trialDays = 0;
    }
  } else if (payload.hasTrial === false) {
    payload.trialDays = 0;
  }

  // Backward compatibility prices
  if (payload.price !== undefined) {
    payload.monthlyPrice = payload.price;
    if (payload.billingCycle === "yearly" || isExist.billingCycle === "yearly") {
      payload.yearlyPrice = payload.price;
    }
  }

  const result = await Package.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deletePackageFromDB = async (id: string): Promise<IPackage | null> => {
  const isExist = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Package not found");
  }

  const result = await Package.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true },
  );

  return result;
};

export const PackageService = {
  createPackageIntoDB,
  getAllPackagesFromDB,
  getPackageByIdFromDB,
  updatePackageIntoDB,
  deletePackageFromDB,
};
