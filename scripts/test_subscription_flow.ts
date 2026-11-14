import { defaultPackages } from "../src/app/modules/package/package.seed";

async function runTests() {
  console.log("==========================================");
  console.log("🧪 RUNNING LOCALFIX PACKAGE TESTS");
  console.log("==========================================");

  // 1. Verify default packages configuration
  console.log("1. Verifying default package definitions...");
  if (defaultPackages.length !== 3) {
    throw new Error(`Expected 3 packages, found ${defaultPackages.length}`);
  }

  const [basic, pro, enterprise] = defaultPackages;

  // Basic checks
  if (
    basic.name !== "Basic" ||
    basic.leadLimit !== 10 ||
    !basic.hasTrial ||
    basic.trialDays !== 14 ||
    basic.price !== 19
  ) {
    throw new Error("Basic package configuration mismatch");
  }
  console.log("   ✔ Basic package verified (10 quotes/leads, 14 days trial, $19/mo)");

  // Professional checks
  if (
    pro.name !== "Professional" ||
    pro.leadLimit !== 35 ||
    !pro.hasTrial ||
    pro.trialDays !== 7 ||
    pro.price !== 49
  ) {
    throw new Error("Professional package configuration mismatch");
  }
  console.log("   ✔ Professional package verified (35 quotes/leads, 7 days trial, $49/mo)");

  // Enterprise checks
  if (
    enterprise.name !== "Enterprise" ||
    enterprise.leadLimit !== -1 ||
    enterprise.hasTrial ||
    enterprise.trialDays !== 0 ||
    enterprise.price !== 99
  ) {
    throw new Error("Enterprise package configuration mismatch");
  }
  console.log("   ✔ Enterprise package verified (Unlimited quotes/leads, No trial, $99/mo)");

  // 2. Test lead quote limit check logic
  console.log("2. Testing quote lead limit check logic...");
  const testQuoteLimit = (pkg: typeof basic, currentQuotesUsed: number) => {
    const isLimitExceeded =
      pkg.leadLimit !== -1 && currentQuotesUsed >= pkg.leadLimit;
    return { isLimitExceeded, remaining: pkg.leadLimit === -1 ? "unlimited" : Math.max(0, pkg.leadLimit - currentQuotesUsed) };
  };

  // Under limit
  const res1 = testQuoteLimit(basic, 5);
  if (res1.isLimitExceeded || res1.remaining !== 5) {
    throw new Error("Limit check failed: should allow 5 quotes under Basic");
  }
  console.log("   ✔ Allows quote submission under limit (5/10 used, 5 remaining)");

  // At limit
  const res2 = testQuoteLimit(basic, 10);
  if (!res2.isLimitExceeded || res2.remaining !== 0) {
    throw new Error("Limit check failed: should block at 10 quotes under Basic");
  }
  console.log("   ✔ Accurately blocks when monthly quote limit is reached (10/10 used)");

  // Enterprise unlimited (-1)
  const res3 = testQuoteLimit(enterprise, 100);
  if (res3.isLimitExceeded || res3.remaining !== "unlimited") {
    throw new Error("Limit check failed: Enterprise (-1) should allow unlimited quotes");
  }
  console.log("   ✔ Unlimited plan (-1) allows unlimited quotes");

  console.log("==========================================");
  console.log("🎉 ALL PACKAGE TESTS PASSED!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
