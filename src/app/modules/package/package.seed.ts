import colors from "colors";
import { Package } from "./package.model";
import { logger } from "../../../shared/logger";

export const defaultPackages = [
  {
    name: "Basic",
    description: "Ideal for new professionals starting out and exploring local job requests.",
    price: 19,
    billingCycle: "monthly" as const,
    leadLimit: 10,
    features: [
      "Send up to 10 quotes per month",
      "Accept direct homeowner job requests",
      "Standard verified profile listing",
      "In-app customer messaging & notifications",
      "14-day free trial included",
      "Standard customer support",
    ],
    hasTrial: true,
    trialDays: 14,
    isPopular: false,
    isActive: true,
    monthlyPrice: 19,
    yearlyPrice: 190,
  },
  {
    name: "Professional",
    description: "Best value for established professionals seeking consistent job flow and high visibility.",
    price: 49,
    billingCycle: "monthly" as const,
    leadLimit: 35,
    features: [
      "Send up to 35 quotes per month",
      "Verified Pro badge on public profile",
      "Featured placement in search & category results",
      "Instant SMS & push notifications for urgent leads",
      "Showcase portfolio & customer reviews",
      "7-day free trial included",
      "Priority customer support",
    ],
    hasTrial: true,
    trialDays: 7,
    isPopular: true,
    isActive: true,
    monthlyPrice: 49,
    yearlyPrice: 490,
  },
  {
    name: "Enterprise",
    description: "Maximum lead volume and VIP features for high-performing contractors and local agencies.",
    price: 99,
    billingCycle: "monthly" as const,
    leadLimit: -1, // Unlimited
    features: [
      "Unlimited quote submissions & lead responses",
      "Top search ranking & premium badge placement",
      "Background check verification badge display",
      "Priority access to emergency dispatch jobs",
      "Dedicated account manager",
      "24/7 VIP priority phone & chat support",
    ],
    hasTrial: false,
    trialDays: 0,
    isPopular: false,
    isActive: true,
    monthlyPrice: 99,
    yearlyPrice: 990,
  },
];

export const seedDefaultPackages = async () => {
  try {
    const count = await Package.countDocuments({ isDeleted: { $ne: true } });
    if (count === 0) {
      for (const pkg of defaultPackages) {
        await Package.create(pkg);
      }
      logger.info(
        colors.green(
          "✔ Default subscription packages seeded successfully for LocalFix!",
        ),
      );
    }
  } catch (error) {
    logger.error("Error seeding default packages:", error);
  }
};
