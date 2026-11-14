import { Model } from "mongoose";

export type IPackage = {
  name: string;
  description?: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  leadLimit: number; // Number of quotations / lead responses allowed per month (-1 for Unlimited)
  hasTrial: boolean;
  trialDays: number; // Configurable by Admin from dashboard (e.g., 7, 14, 0)
  isPopular?: boolean;
  isActive: boolean;
  isDeleted?: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  stripeMonthlyPriceId?: string; // Optional for backward compatibility
  stripeYearlyPriceId?: string; // Optional for backward compatibility
  monthlyPrice?: number; // Optional for backward compatibility
  yearlyPrice?: number; // Optional for backward compatibility
};

export type PackageModel = Model<IPackage>;
