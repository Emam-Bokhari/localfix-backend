import Stripe from "stripe";
import mongoose, { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import config from "../../../config";
import { STATUS, USER_ROLES } from "../../../enums/user";
import { getStripe } from "../../../helpers/stripeHelper";
import {
  formatCurrency,
  formatMonthlyPrice,
  getCurrencyCodeUpper,
  getCurrencySymbol,
} from "../../../helpers/currencyHelper";
import { IPackage } from "../package/package.interface";
import { Package } from "../package/package.model";
import { Subscription } from "../subscription/subscription.model";
import { User } from "../user/user.model";
import {
  IAdminCascadeActionResult,
  IAdminContractorItem,
  IAdminDashboardStats,
  IAdminLandlordDetail,
  IAdminLandlordFullDetails,
  IAdminLandlordListItem,
  IAdminLandlordsResponse,
  IAdminMonthlyRevenueResponse,
  IAdminPropertyItem,
  IAdminPropertyUnitItem,
  IAdminTenantItem,
  IAdminTransactionItem,
  IAdminTransactionQuery,
  IAdminTransactionsResponse,
  IAdminTransactionStats,
  IAdminUserGrowthResponse,
  IMonthlyRevenueItem,
  IUserGrowthItem,
} from "./admin.interface";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// 1. Existing Dashboard Stats (Cards)
const getAdminDashboardDataFromDB = async (): Promise<IAdminDashboardStats> => {
  const [totalLandlords, activeSubscriptions] = await Promise.all([
    // Total Landlords
    User.countDocuments({
      role: USER_ROLES.HOME_OWNER,
      isDeleted: { $ne: true },
    }),

    // Active Subscriptions with Package details
    Subscription.find({
      status: "active",
      isDeleted: { $ne: true },
    })
      .populate<{ packageId: IPackage }>("packageId")
      .lean(),
  ]);

  // Calculate Monthly Revenue across active subscriptions
  let monthlyRevenue = 0;
  for (const sub of activeSubscriptions) {
    const pkg = sub.packageId as unknown as IPackage;
    if (pkg) {
      if (sub.planType === "yearly") {
        const yearlyAmount =
          typeof pkg.yearlyPrice === "number" ? pkg.yearlyPrice : 0;
        monthlyRevenue +=
          yearlyAmount > 0
            ? Math.round((yearlyAmount / 12) * 100) / 100
            : pkg.monthlyPrice || 0;
      } else {
        monthlyRevenue += pkg.monthlyPrice || 0;
      }
    }
  }

  monthlyRevenue = Math.round(monthlyRevenue * 100) / 100;

  return {
    totalLandlords,
    monthlyRevenue,
    activeSubscriptions: activeSubscriptions.length,
  };
};

// 2. Monthly Revenue - Landlord subscription income (Billed via Stripe)
const getMonthlyRevenueFromDB = async (
  year?: number,
): Promise<IAdminMonthlyRevenueResponse> => {
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  const monthlyTotals: number[] = new Array(12).fill(0);
  let hasStripeInvoices = false;

  // Try fetching paid invoices directly from Stripe if secret key is present
  const secretKey = config.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  if (secretKey) {
    try {
      const stripe = getStripe();
      const gte = Math.floor(startOfYear.getTime() / 1000);
      const lte = Math.floor(endOfYear.getTime() / 1000);

      let startingAfter: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const response: Stripe.Response<Stripe.ApiList<Stripe.Invoice>> =
          await stripe.invoices.list({
            created: { gte, lte },
            status: "paid",
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });

        if (response.data && response.data.length > 0) {
          hasStripeInvoices = true;
          for (const invoice of response.data) {
            const invoiceDate = new Date(invoice.created * 1000);
            const monthIndex = invoiceDate.getMonth();
            const amount = (invoice.amount_paid || 0) / 100;
            monthlyTotals[monthIndex] += amount;
          }
          startingAfter = response.data[response.data.length - 1].id;
          hasMore = response.has_more;
        } else {
          hasMore = false;
        }
      }
    } catch {
      // In case of local/offline dev or invalid Stripe keys, continue to DB fallback
      hasStripeInvoices = false;
    }
  }

  // Fallback to internal Subscription and Package database
  if (!hasStripeInvoices) {
    const subscriptions = await Subscription.find({
      isDeleted: { $ne: true },
      isTrial: { $ne: true },
    })
      .populate<{ packageId: IPackage }>("packageId")
      .lean();

    const now = new Date();

    for (const sub of subscriptions) {
      const pkg = sub.packageId as unknown as IPackage;
      if (!pkg) continue;

      const subCreatedAt = (sub as any).createdAt
        ? new Date((sub as any).createdAt)
        : sub.currentPeriodStart
          ? new Date(sub.currentPeriodStart)
          : new Date();
      const monthlyRate =
        sub.planType === "yearly"
          ? (pkg.yearlyPrice || 0) > 0
            ? Math.round(((pkg.yearlyPrice || 0) / 12) * 100) / 100
            : pkg.monthlyPrice || 0
          : pkg.monthlyPrice || 0;

      for (let m = 0; m < 12; m++) {
        // Skip future months that have not occurred yet
        if (
          targetYear > now.getFullYear() ||
          (targetYear === now.getFullYear() && m > now.getMonth())
        ) {
          continue;
        }

        const monthStart = new Date(targetYear, m, 1);
        const monthEnd = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

        // Subscription must have started on or before the month end
        if (subCreatedAt <= monthEnd) {
          // If subscription was canceled before this month began, skip
          if (sub.canceledAt && new Date(sub.canceledAt) < monthStart) {
            continue;
          }

          monthlyTotals[m] += monthlyRate;
        }
      }
    }
  }

  const revenueData: IMonthlyRevenueItem[] = MONTH_NAMES.map((month, idx) => ({
    month,
    revenue: Math.round(monthlyTotals[idx] * 100) / 100,
  }));

  const totalRevenue =
    Math.round(revenueData.reduce((acc, curr) => acc + curr.revenue, 0) * 100) /
    100;

  return {
    year: targetYear,
    totalRevenue,
    revenue: revenueData,
  };
};

// 3. User Growth - Registered landlords, tenants & contractors
const getUserGrowthFromDB = async (
  year?: number,
): Promise<IAdminUserGrowthResponse> => {
  const targetYear = year ? Number(year) : new Date().getFullYear();
  const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  // 1. Baseline users created prior to the start of the target year
  const baselineUsers = await User.aggregate([
    {
      $match: {
        role: {
          $in: [
            USER_ROLES.HOME_OWNER,
            USER_ROLES.PROFESSIONAL,
            USER_ROLES.PROFESSIONAL,
          ],
        },
        isDeleted: { $ne: true },
        createdAt: { $lt: startOfYear },
      },
    },
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
  ]);

  let cumulativeLandlords = 0;
  let cumulativeTenants = 0;
  let cumulativeContractors = 0;

  for (const item of baselineUsers) {
    if (item._id === USER_ROLES.HOME_OWNER) cumulativeLandlords = item.count;
    if (item._id === USER_ROLES.PROFESSIONAL) cumulativeTenants = item.count;
    if (item._id === USER_ROLES.PROFESSIONAL)
      cumulativeContractors = item.count;
  }

  // 2. New registrations during the target year grouped by role and month
  const usersInYear = await User.aggregate([
    {
      $match: {
        role: {
          $in: [
            USER_ROLES.HOME_OWNER,
            USER_ROLES.PROFESSIONAL,
            USER_ROLES.PROFESSIONAL,
          ],
        },
        isDeleted: { $ne: true },
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: {
          role: "$role",
          month: { $month: "$createdAt" }, // 1 to 12
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const monthlyNewMap: Record<
    number,
    { landlords: number; tenants: number; contractors: number }
  > = {};

  for (let m = 1; m <= 12; m++) {
    monthlyNewMap[m] = { landlords: 0, tenants: 0, contractors: 0 };
  }

  for (const item of usersInYear) {
    const month = item._id.month;
    const role = item._id.role;
    if (monthlyNewMap[month]) {
      if (role === USER_ROLES.HOME_OWNER) {
        monthlyNewMap[month].landlords = item.count;
      }
      if (role === USER_ROLES.PROFESSIONAL) {
        monthlyNewMap[month].tenants = item.count;
      }
      if (role === USER_ROLES.PROFESSIONAL) {
        monthlyNewMap[month].contractors = item.count;
      }
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth(); // 0-indexed: 0 = Jan, 9 = Oct

  // 3. Build user growth across 12 months
  const growthData: IUserGrowthItem[] = MONTH_NAMES.map((month, idx) => {
    const m = idx + 1;
    const newCounts = monthlyNewMap[m];

    // Check if this month is in the future
    const isFutureMonth =
      targetYear > currentYear ||
      (targetYear === currentYear && idx > currentMonthIndex);

    cumulativeLandlords += newCounts.landlords;
    cumulativeTenants += newCounts.tenants;
    cumulativeContractors += newCounts.contractors;

    if (isFutureMonth) {
      return {
        month,
        landlords: 0,
        tenants: 0,
        contractors: 0,
        total: 0,
        newLandlords: 0,
        newTenants: 0,
        newContractors: 0,
      };
    }

    return {
      month,
      landlords: cumulativeLandlords,
      tenants: cumulativeTenants,
      contractors: cumulativeContractors,
      total: cumulativeLandlords + cumulativeTenants + cumulativeContractors,
      newLandlords: newCounts.landlords,
      newTenants: newCounts.tenants,
      newContractors: newCounts.contractors,
    };
  });

  return {
    year: targetYear,
    growth: growthData,
  };
};

// ==========================================
// 4. Admin Transactions & Summary Stats
// ==========================================

const formatTransactionDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const fetchUnifiedTransactions = async (): Promise<IAdminTransactionItem[]> => {
  // 1. Query MongoDB Subscription collection (Ground truth)
  const subscriptions = await Subscription.find({
    isDeleted: { $ne: true },
  })
    .populate<{ userId: any }>("userId")
    .populate<{ packageId: IPackage }>("packageId")
    .sort({ createdAt: -1 })
    .lean();

  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  const items: IAdminTransactionItem[] = [];
  const secretKey = config.stripe?.secretKey || process.env.STRIPE_SECRET_KEY;
  let stripe: Stripe | null = null;
  if (secretKey) {
    try {
      stripe = getStripe();
    } catch {
      stripe = null;
    }
  }

  const defaultCurrency = getCurrencyCodeUpper();
  const defaultSymbol = getCurrencySymbol(defaultCurrency);

  for (const sub of subscriptions) {
    const user = sub.userId;
    const pkg = sub.packageId as unknown as IPackage;
    if (!user) continue;

    const isYearly = sub.planType === "yearly";
    const packagePrice = isYearly
      ? pkg?.yearlyPrice || 0
      : pkg?.monthlyPrice || 0;

    let transactionInvoices: Stripe.Invoice[] = [];

    // If Stripe is available, fetch only the invoices belonging to THIS specific subscription
    if (stripe && sub.stripeSubscriptionId) {
      try {
        const invList = await stripe.invoices.list({
          subscription: sub.stripeSubscriptionId,
          limit: 100,
        });
        if (invList.data && invList.data.length > 0) {
          transactionInvoices = invList.data;
        }
      } catch {
        // Fallback to latestInvoiceId or direct DB record
      }
    } else if (stripe && sub.latestInvoiceId) {
      try {
        const singleInv = await stripe.invoices.retrieve(sub.latestInvoiceId);
        if (singleInv) {
          transactionInvoices = [singleInv];
        }
      } catch {
        // Fallback to direct DB record
      }
    }

    if (transactionInvoices.length > 0) {
      for (const inv of transactionInvoices) {
        const isPaid = inv.status === "paid";
        const statusText: "Completed" | "Failed" = isPaid
          ? "Completed"
          : "Failed";

        const amount =
          inv.amount_paid > 0
            ? inv.amount_paid / 100
            : inv.total > 0
              ? inv.total / 100
              : packagePrice;

        const currency = (inv.currency || defaultCurrency).toUpperCase();
        const currencySymbol = getCurrencySymbol(inv.currency);
        const invDate = new Date(inv.created * 1000);

        items.push({
          id: inv.id,
          transactionId: inv.id,
          invoiceNumber: inv.number || inv.id,
          landlord: {
            id: user._id.toString(),
            name: user.name || inv.customer_name || "Landlord",
            email: user.email || inv.customer_email || "",
            profileImage: user.profileImage || "",
          },
          plan: pkg?.name || "Starter Plus",
          billing: isYearly ? "Yearly" : "Monthly",
          amount,
          formattedAmount: `${currencySymbol}${amount}`,
          currency,
          currencySymbol,
          method: "Card",
          status: statusText,
          date: invDate.toISOString(),
          formattedDate: formatTransactionDate(invDate),
          invoiceUrl: inv.hosted_invoice_url || "",
          invoicePdf: inv.invoice_pdf || "",
        });
      }
    } else {
      // Direct MongoDB record
      const isCompleted = sub.status === "active" || sub.status === "trialing";
      const statusText: "Completed" | "Failed" = isCompleted
        ? "Completed"
        : "Failed";
      const transDate = sub.currentPeriodStart
        ? new Date(sub.currentPeriodStart)
        : sub.createdAt
          ? new Date(sub.createdAt)
          : new Date();

      items.push({
        id: sub._id.toString(),
        transactionId:
          sub.latestInvoiceId || `sub_${sub._id.toString().slice(-8)}`,
        invoiceNumber: sub.latestInvoiceId
          ? sub.latestInvoiceId.toUpperCase()
          : `INV-${sub._id.toString().slice(-6).toUpperCase()}`,
        landlord: {
          id: user._id.toString(),
          name: user.name || "Landlord",
          email: user.email || "",
          profileImage: user.profileImage || "",
        },
        plan: pkg?.name || "Starter Plus",
        billing: isYearly ? "Yearly" : "Monthly",
        amount: packagePrice,
        formattedAmount: `${defaultSymbol}${packagePrice}`,
        currency: defaultCurrency,
        currencySymbol: defaultSymbol,
        method: "Card",
        status: statusText,
        date: transDate.toISOString(),
        formattedDate: formatTransactionDate(transDate),
        invoiceUrl: "",
        invoicePdf: "",
      });
    }
  }

  return items;
};

// Filter transactions by date or pre-set range
const filterTransactionsByDate = (
  list: IAdminTransactionItem[],
  query: IAdminTransactionQuery,
): IAdminTransactionItem[] => {
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (query.startDate) {
    startDate = new Date(query.startDate);
  }
  if (query.endDate) {
    endDate = new Date(query.endDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const dateRange = (query.dateRange || query.range || "").toLowerCase();

  if (!startDate && !endDate && dateRange && dateRange !== "all_time") {
    const now = new Date();
    if (dateRange === "today") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
    } else if (dateRange === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (dateRange === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    } else if (dateRange === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
  }

  if (startDate || endDate) {
    return list.filter((item) => {
      const d = new Date(item.date);
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }

  return list;
};

// Filter transactions by tab status ("all", "completed", "failed")
const filterTransactionsByStatus = (
  list: IAdminTransactionItem[],
  status?: string,
): IAdminTransactionItem[] => {
  if (!status || status.toLowerCase() === "all") return list;
  const s = status.toLowerCase();
  if (s === "completed" || s === "paid" || s === "success") {
    return list.filter((item) => item.status === "Completed");
  }
  if (s === "failed" || s === "unpaid" || s === "uncollectible") {
    return list.filter((item) => item.status === "Failed");
  }
  return list;
};

// Filter transactions by search term
const filterTransactionsBySearch = (
  list: IAdminTransactionItem[],
  query: IAdminTransactionQuery,
): IAdminTransactionItem[] => {
  const term = (query.searchTerm || query.search || query.q || "")
    .trim()
    .toLowerCase();

  if (!term) return list;

  return list.filter(
    (item) =>
      item.landlord.name.toLowerCase().includes(term) ||
      item.landlord.email.toLowerCase().includes(term) ||
      item.plan.toLowerCase().includes(term) ||
      item.invoiceNumber.toLowerCase().includes(term) ||
      item.transactionId.toLowerCase().includes(term),
  );
};

// API 1: Transaction Summary Cards (Total Collected, Transactions, Paying Landlords)
const getTransactionStatsFromDB = async (
  query: IAdminTransactionQuery = {},
): Promise<IAdminTransactionStats> => {
  let allTransactions = await fetchUnifiedTransactions();

  // Apply optional date filter (e.g., "All Time", "This Month", etc.)
  allTransactions = filterTransactionsByDate(allTransactions, query);

  const completedTransactions = allTransactions.filter(
    (item) => item.status === "Completed",
  );

  const totalCollected =
    Math.round(
      completedTransactions.reduce((acc, curr) => acc + curr.amount, 0) * 100,
    ) / 100;

  const totalTransactions = allTransactions.length;

  const payingLandlordsSet = new Set<string>();
  for (const item of completedTransactions) {
    const identifier = item.landlord.id || item.landlord.email;
    if (identifier) {
      payingLandlordsSet.add(identifier);
    }
  }
  const payingLandlords = payingLandlordsSet.size;

  const currency = allTransactions[0]?.currency || getCurrencyCodeUpper();
  const currencySymbol =
    allTransactions[0]?.currencySymbol || getCurrencySymbol(currency);

  return {
    totalCollected,
    formattedTotalCollected: `${currencySymbol}${totalCollected}`,
    currency,
    currencySymbol,
    totalTransactions,
    payingLandlords,
  };
};

// API 2: Transactions List (Table, Search, Status tabs, Date filter, Pagination, CSV Export)
const getTransactionsFromDB = async (
  query: IAdminTransactionQuery = {},
): Promise<IAdminTransactionsResponse> => {
  let transactions = await fetchUnifiedTransactions();

  // 1. Date Range Filter
  transactions = filterTransactionsByDate(transactions, query);

  // 2. Status Filter ("all", "completed", "failed")
  transactions = filterTransactionsByStatus(transactions, query.status);

  // 3. Search Filter
  transactions = filterTransactionsBySearch(transactions, query);

  // Sort descending by date
  transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const total = transactions.length;

  const isExport =
    query.export === true ||
    query.export === "true" ||
    query.limit === "all" ||
    Number(query.limit) === -1;

  if (isExport) {
    return {
      meta: {
        page: 1,
        limit: total,
        total,
        totalPage: 1,
      },
      data: transactions,
    };
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const totalPage = Math.ceil(total / limit) || 1;

  const startIndex = (page - 1) * limit;
  const paginatedData = transactions.slice(startIndex, startIndex + limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data: paginatedData,
  };
};

// ==========================================
// 5. Landlord Management & Cascade Operations
// ==========================================

const formatDate = (date?: Date | string | null): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return "LL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatFloor = (floor?: number, floorNote?: string): string => {
  if (floorNote && floorNote.trim()) return floorNote.trim();
  if (floor === undefined || floor === null || floor === 0)
    return "Ground Floor";
  if (floor === 1) return "1st Floor";
  if (floor === 2) return "2nd Floor";
  if (floor === 3) return "3rd Floor";
  return `${floor}th Floor`;
};

const formatContractDuration = (
  startDate?: Date | string,
  endDate?: Date | string,
): string => {
  if (!startDate || !endDate) return "AST Fixed 12m";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "AST Fixed 12m";
  const diffMonths = Math.max(
    1,
    Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
    ),
  );
  return `AST Fixed ${diffMonths}m`;
};

const getLandlordsFromDB = async (
  query: Record<string, unknown>,
): Promise<IAdminLandlordsResponse> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Number(query.limit) || 10);
  const skip = (page - 1) * limit;

  const searchTerm =
    (query.searchTerm as string) || (query.search as string) || "";
  const statusFilter = ((query.status as string) || "all").toLowerCase();
  const sortBy = (query.sortBy as string) || "newest";

  const baseFilter: Record<string, any> = {
    role: { $in: [USER_ROLES.HOME_OWNER, USER_ROLES.PROFESSIONAL] },
    isDeleted: { $ne: true },
  };

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim();
    baseFilter.$or = [
      { name: { $regex: term, $options: "i" } },
      { email: { $regex: term, $options: "i" } },
      { phone: { $regex: term, $options: "i" } },
      { companyName: { $regex: term, $options: "i" } },
    ];
  }

  if (statusFilter === "suspended" || statusFilter === "inactive") {
    baseFilter.status = STATUS.INACTIVE;
  } else if (statusFilter === "active") {
    baseFilter.status = STATUS.ACTIVE;
  }

  const sortOrder = sortBy === "oldest" ? 1 : -1;

  const [allCount, suspendedCount, users, totalFiltered] = await Promise.all([
    User.countDocuments({
      role: { $in: [USER_ROLES.HOME_OWNER, USER_ROLES.PROFESSIONAL] },
      isDeleted: { $ne: true },
    }),
    User.countDocuments({
      role: { $in: [USER_ROLES.HOME_OWNER, USER_ROLES.PROFESSIONAL] },
      status: STATUS.INACTIVE,
      isDeleted: { $ne: true },
    }),
    User.find(baseFilter)
      .select("-password -authentication -deviceToken")
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(baseFilter),
  ]);

  const data: IAdminLandlordListItem[] = users.map((u: any) => ({
    id: u._id.toString(),
    name: u.name,
    initials: getInitials(u.name),
    email: u.email,
    phone: u.phone || "",
    profileImage: u.profileImage || "",
    status: u.status === STATUS.INACTIVE ? "suspended" : "active",
    rawStatus: u.status === STATUS.INACTIVE ? "inactive" : "active",
    statusBadge:
      u.status === STATUS.INACTIVE
        ? { label: "Suspended", variant: "danger" }
        : { label: "Active", variant: "success" },
    portfolio: {
      propertiesCount: 0,
      unitsCount: 0,
      maxUnits: null,
      formattedPortfolio: "0 Properties",
      formattedUnits: "0 units",
      isNearLimit: false,
    },
    plan: null,
    joinedDate: formatDate(u.createdAt),
    createdAt: u.createdAt,
  }));

  return {
    summary: {
      allCount,
      activeCount: Math.max(0, allCount - suspendedCount),
      trialCount: 0,
      pastDueCount: 0,
      suspendedCount,
    },
    meta: {
      page,
      limit,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / limit) || 1,
    },
    data,
  };
};

const getLandlordByIdFromDB = async (
  userId: string,
): Promise<IAdminLandlordDetail> => {
  const user: any = await User.findOne({
    _id: userId,
    isDeleted: { $ne: true },
  })
    .select("-password -authentication -deviceToken")
    .lean();

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const isSuspended = user.status === STATUS.INACTIVE;

  return {
    id: user._id.toString(),
    displayId: `ID: #${user._id.toString().slice(-4)}`,
    name: user.name,
    initials: getInitials(user.name),
    email: user.email,
    phone: user.phone || "",
    profileImage: user.profileImage || "",
    address: user.location?.address || user.zipCode || "",
    status: isSuspended ? "suspended" : "active",
    statusBadge: isSuspended ? "Suspended Landlord" : "Active Landlord",
    joinedDate: formatDate(user.createdAt),
    createdAt: user.createdAt,
    stats: {
      managedProperties: 0,
      rentalUnits: 0,
      activeTenants: 0,
      assignedContractors: 0,
    },
    plan: null,
  };
};

const getLandlordPropertiesFromDB = async (
  _userId: string,
): Promise<IAdminPropertyItem[]> => [];
const getLandlordTenantsFromDB = async (
  _userId: string,
): Promise<IAdminTenantItem[]> => [];
const getLandlordContractorsFromDB = async (
  _userId: string,
): Promise<IAdminContractorItem[]> => [];

const getLandlordFullDetailsFromDB = async (
  userId: string,
): Promise<IAdminLandlordFullDetails> => {
  const landlord = await getLandlordByIdFromDB(userId);
  return {
    landlord,
    properties: [],
    tenants: [],
    contractors: [],
  };
};

const updateLandlordStatusToDB = async (
  userId: string,
  status: STATUS.ACTIVE | STATUS.INACTIVE,
): Promise<IAdminCascadeActionResult> => {
  const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  await User.findByIdAndUpdate(userId, { status });

  return {
    landlordId: userId,
    action: status === STATUS.INACTIVE ? "suspend" : "activate",
    landlordStatus: status,
    affectedTenantsCount: 0,
    affectedContractorsCount: 0,
    message: `User status updated to ${status}.`,
  };
};

const deleteLandlordFromDB = async (
  userId: string,
): Promise<IAdminCascadeActionResult> => {
  const user = await User.findOne({ _id: userId, isDeleted: { $ne: true } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  await User.softDeleteById(userId);
  await Subscription.updateMany(
    { userId, isDeleted: { $ne: true } },
    { isDeleted: true, status: "canceled", canceledAt: new Date() },
  );

  return {
    landlordId: userId,
    action: "delete",
    landlordStatus: "deleted",
    affectedTenantsCount: 0,
    affectedContractorsCount: 0,
    affectedPropertiesCount: 0,
    affectedFlatsCount: 0,
    message: "User soft-deleted successfully.",
  };
};

export const AdminService = {
  getAdminDashboardDataFromDB,
  getMonthlyRevenueFromDB,
  getUserGrowthFromDB,
  getTransactionStatsFromDB,
  getTransactionsFromDB,
  getLandlordsFromDB,
  getLandlordByIdFromDB,
  getLandlordPropertiesFromDB,
  getLandlordTenantsFromDB,
  getLandlordContractorsFromDB,
  getLandlordFullDetailsFromDB,
  updateLandlordStatusToDB,
  deleteLandlordFromDB,
};
