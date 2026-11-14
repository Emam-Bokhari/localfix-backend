import colors from "colors";
import { User } from "../app/modules/user/user.model";
import config from "../config";
import { USER_ROLES } from "../enums/user";
import { logger } from "../shared/logger";
import { seedDefaultPackages } from "../app/modules/package/package.seed";

const superUser = {
  name: "Super Admin",
  role: USER_ROLES.SUPER_ADMIN,
  email: config.admin.email,
  password: config.admin.password,
  verified: true,
  phone: "+1234567890",
  countryCode: "+1",
};

const seedSuperAdmin = async () => {
  const existingUser = await User.findOne({
    email: config.admin.email,
  });

  if (!existingUser) {
    await User.create(superUser);
    logger.info(colors.green("✔ Super admin created successfully!"));
  } else if (existingUser.role !== USER_ROLES.SUPER_ADMIN) {
    existingUser.role = USER_ROLES.SUPER_ADMIN;
    existingUser.verified = true;
    if (!existingUser.phone) {
      existingUser.phone = "+1234567890";
    }
    if (!existingUser.countryCode) {
      existingUser.countryCode = "+1";
    }

    await existingUser.save();
    logger.info(colors.yellow("✔ Existing user promoted to Super Admin!"));
  } else {
    logger.info(colors.cyan("✔ Super Admin already exists."));
  }

  // Seed default subscription packages for LocalFix
  await seedDefaultPackages();
};

export default seedSuperAdmin;
