// filterUtils.ts

import { PostQueryFilters, PostWithID, UserType } from "../../../utils/types";

const normalizeLoose = (value?: string | null): string =>
  (value ?? "")
    .toLowerCase()
    .replace(/[\s\-#'.&,]+/g, "")
    .trim();

const normalizeBrand = (brand?: string | null): string => normalizeLoose(brand);

const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "startDate" in value &&
    "endDate" in value
  ) {
    const range = value as {
      startDate?: string | null;
      endDate?: string | null;
    };
    return !range.startDate && !range.endDate;
  }

  return false;
};

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getFilterSummaryText = (
  filters: PostQueryFilters | null | undefined,
  users: UserType[],
): string => {
  if (!filters) return "";

  const parts: string[] = [];

  if (filters.hashtag) parts.push(filters.hashtag);
  if (filters.starTag) parts.push(filters.starTag);
  if (filters.brand) parts.push(`Brand: ${filters.brand}`);
  if (filters.productType) parts.push(`Product: ${filters.productType}`);
  if (filters.distributorCompanyName) {
    parts.push(`Distributor: ${filters.distributorCompanyName}`);
  }
  if (filters.accountName) parts.push(`Store: ${filters.accountName}`);
  if (filters.accountType) parts.push(`Type: ${filters.accountType}`);
  if (filters.accountChain) parts.push(`Chain: ${filters.accountChain}`);
  if (filters.chainType) parts.push(`Chain Type: ${filters.chainType}`);

  if (filters.states?.length) {
    parts.push(`States: ${filters.states.join(", ")}`);
  }

  if (filters.cities?.length) {
    parts.push(`Cities: ${filters.cities.join(", ")}`);
  }

  if (filters.minCaseCount != null) {
    parts.push(`≥ ${filters.minCaseCount} cases`);
  }

  if (filters.postUserUid) {
    const user = users.find((x) => x.uid === filters.postUserUid);
    parts.push(
      user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
        : filters.postUserUid,
    );
  }

  if (filters.companyGoalId && filters.companyGoalTitle) {
    parts.push(`Goal: ${filters.companyGoalTitle}`);
  }

  if (filters.galloGoalId && filters.galloGoalTitle) {
    parts.push(`Gallo Goal: ${filters.galloGoalTitle}`);
  }

  const { startDate, endDate } = filters.dateRange || {};

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate).toLocaleDateString() : "";
    const end = endDate ? new Date(endDate).toLocaleDateString() : "";

    parts.push(
      start && end && start !== end
        ? `From ${start} to ${end}`
        : `Date: ${start || end}`,
    );
  }

  return parts.join(" • ");
};

export function removeFilterField(
  filters: PostQueryFilters,
  field: keyof PostQueryFilters,
  valueToRemove?: string,
): PostQueryFilters {
  if (field === "dateRange") {
    return {
      ...filters,
      dateRange: { startDate: null, endDate: null },
    };
  }

  if (field === "companyGoalId") {
    return {
      ...filters,
      companyGoalId: null,
      companyGoalTitle: null,
    };
  }

  if (field === "galloGoalId") {
    return {
      ...filters,
      galloGoalId: null,
      galloGoalTitle: null,
    };
  }

  if (field === "accountName" || field === "accountNumber") {
    return {
      ...filters,
      accountName: null,
      accountNumber: null,
    };
  }

  if (field === "brand") {
    return {
      ...filters,
      brand: null,
      brandId: null,
    };
  }

  if (field === "distributorCompanyId" || field === "distributorCompanyName") {
    return {
      ...filters,
      distributorCompanyId: null,
      distributorCompanyName: null,
      accountName: null,
      accountNumber: null,
    };
  }

  const current = filters[field];

  if (Array.isArray(current)) {
    return {
      ...filters,
      [field]: valueToRemove
        ? current.filter((val) => val !== valueToRemove)
        : [],
    };
  }

  return {
    ...filters,
    [field]: null,
  };
}

export function clearAllFilters(
  feedType: PostQueryFilters["feedType"] = "company",
): PostQueryFilters {
  return {
    companyId: null,
    postUserUid: null,

    accountNumber: null,
    accountName: null,
    accountType: null,
    accountChain: null,
    chainType: null,

    hashtag: null,
    starTag: null,

    brand: null,
    brandId: null,
    productType: null,

    companyGoalId: null,
    companyGoalTitle: null,
    galloGoalId: null,
    galloGoalTitle: null,

    distributorCompanyId: null,
    distributorCompanyName: null,

    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
    minCaseCount: null,

    feedType,
  };
}

let lastFilters: PostQueryFilters | null = null;
let lastPosts: PostWithID[] | null = null;
let lastResult: PostWithID[] = [];

function deepEqualFilters(a: PostQueryFilters, b: PostQueryFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function locallyFilterPostsMemo(
  posts: PostWithID[],
  filters: PostQueryFilters,
): PostWithID[] {
  if (
    lastFilters &&
    lastPosts === posts &&
    deepEqualFilters(filters, lastFilters)
  ) {
    return lastResult;
  }

  const result = locallyFilterPosts(posts, filters);

  lastFilters =
    typeof structuredClone === "function"
      ? structuredClone(filters)
      : JSON.parse(JSON.stringify(filters));

  lastPosts = posts;
  lastResult = result;

  return result;
}

export function locallyFilterPosts(
  posts: PostWithID[],
  filters: PostQueryFilters,
): PostWithID[] {
  const normalizedBrandFilter = normalizeBrand(filters.brand);
  const normalizedAccountNameFilter = normalizeLoose(filters.accountName);
  const selectedAccountNumber = String(filters.accountNumber ?? "");

  return posts.filter((post) => {
    if (
      filters.distributorCompanyId &&
      post.companyId !== filters.distributorCompanyId
    ) {
      return false;
    }

    if (filters.hashtag) {
      const tag = filters.hashtag.toLowerCase();
      if (!post.hashtags?.some((t) => t.toLowerCase() === tag)) return false;
    }

    if (filters.starTag) {
      const tag = filters.starTag.toLowerCase();
      if (!post.starTags?.some((t) => t.toLowerCase() === tag)) return false;
    }

    if (filters.postUserUid && post.postUserUid !== filters.postUserUid) {
      return false;
    }

    if (filters.companyGoalId && post.companyGoalId !== filters.companyGoalId) {
      return false;
    }

    if (filters.galloGoalId && post.galloGoal?.goalId !== filters.galloGoalId) {
      return false;
    }

    if (filters.brandId) {
      if (!post.brandIds?.includes(filters.brandId)) return false;
    } else if (filters.brand) {
      const matchesBrand = post.brands?.some(
        (brand) => normalizeBrand(brand) === normalizedBrandFilter,
      );

      if (!matchesBrand) return false;
    }

    if (
      filters.productType &&
      !post.productType?.some(
        (type) => type.toLowerCase() === filters.productType?.toLowerCase(),
      )
    ) {
      return false;
    }

    // Account number is the durable filter.
    // Account name is fallback/search-display only.
    if (filters.accountNumber) {
      const postAccountNumber = String(post.accountNumber ?? "");
      const filterAccountNumber = String(filters.accountNumber);

      if (postAccountNumber !== filterAccountNumber) {
        return false;
      }

      if (
        filters.feedType === "shared" &&
        filters.distributorCompanyId &&
        post.companyId !== filters.distributorCompanyId
      ) {
        return false;
      }
    } else if (filters.accountName) {
      const postAccountName = normalizeLoose(post.accountName);

      if (!postAccountName.includes(normalizedAccountNameFilter)) {
        return false;
      }
    }

    if (filters.accountType && post.accountType !== filters.accountType) {
      return false;
    }

    if (filters.accountChain && post.chain !== filters.accountChain) {
      return false;
    }

    if (filters.chainType && post.chainType !== filters.chainType) {
      return false;
    }

    if (
      filters.minCaseCount != null &&
      (post.totalCaseCount ?? 0) < filters.minCaseCount
    ) {
      return false;
    }

    if (
      filters.states?.length &&
      (!post.state || !filters.states.includes(post.state))
    ) {
      return false;
    }

    if (
      filters.cities?.length &&
      (!post.city || !filters.cities.includes(post.city))
    ) {
      return false;
    }

    if (filters.dateRange?.startDate || filters.dateRange?.endDate) {
      const postDate = toMillis(post.displayDate);

      const start = filters.dateRange.startDate
        ? new Date(filters.dateRange.startDate).getTime()
        : null;

      const end = filters.dateRange.endDate
        ? new Date(filters.dateRange.endDate).setHours(23, 59, 59, 999)
        : null;

      if ((start && postDate < start) || (end && postDate > end)) {
        return false;
      }
    }

    return true;
  });
}

export function getFilterHash(filters: PostQueryFilters): string {
  const cleaned: Record<string, unknown> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (key === "distributorCompanyName") return;
    if (!isEmptyValue(value)) {
      cleaned[key] = value;
    }
  });

  const sorted = Object.fromEntries(
    Object.entries(cleaned).sort(([a], [b]) => a.localeCompare(b)),
  );

  return base64EncodeUnicode(JSON.stringify(sorted));
}

function base64EncodeUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1: string) =>
      String.fromCharCode(parseInt(p1, 16)),
    ),
  );
}

export function doesPostMatchFilter(
  post: PostWithID,
  filter: PostQueryFilters,
): boolean {
  return locallyFilterPosts([post], filter).length > 0;
}
