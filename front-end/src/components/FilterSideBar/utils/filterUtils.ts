// filterUtils.ts

import { PostQueryFilters, PostWithID, UserType } from "../../../utils/types";

const normalizeBrand = (brand: string): string =>
  brand.toLowerCase().replace(/[\s\-]+/g, "");

export const getFilterSummaryText = (
  filters: PostQueryFilters | null | undefined,
  users: UserType[]
): string => {
  if (!filters) return "";
  const parts: string[] = [];

  if (filters.hashtag) parts.push(filters.hashtag);
  if (filters.starTag) parts.push(filters.starTag);
  if (filters.brand) parts.push(filters.brand);
  if (filters.productType) parts.push(filters.productType);
  if (filters.postUserUid) {
    const u = users.find(x => x.uid === filters.postUserUid);
    parts.push(u ? `${u.firstName} ${u.lastName}` : filters.postUserUid);
  }

  const { startDate, endDate } = filters.dateRange || {};
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate).toLocaleDateString() : "";
    const end = endDate ? new Date(endDate).toLocaleDateString() : "";
    parts.push(
      start && end && start !== end
        ? `From ${start} to ${end}`
        : `Date: ${start || end}`
    );
  }

  // if nothing matched, return an empty string
  return parts.length > 0 ? parts.join(" • ") : "";
};

export function removeFilterField(
  filters: PostQueryFilters,
  field: keyof PostQueryFilters,
  valueToRemove?: string
): PostQueryFilters {
  if (field === "dateRange") {
    return {
      ...filters,
      dateRange: { startDate: null, endDate: null },
    };
  }

  const current = filters[field];

  if (Array.isArray(current) && valueToRemove) {
    return {
      ...filters,
      [field]: current.filter((val) => val !== valueToRemove),
    };
  }

  return {
    ...filters,
    [field]: null,
  };
}

export function clearAllFilters(): PostQueryFilters {
  return {
    hashtag: null,
    starTag: null,
    brand: null,
    productType: null,
    accountName: null,
    postUserUid: null,
    companyGoalId: null,
    companyGoalTitle: null,
    dateRange: { startDate: null, endDate: null },
    companyId: null,
    states: [],
    cities: [],
    accountType: null,
    accountChain: null,
    chainType: null,
  };
}

let lastFilters: PostQueryFilters | null = null;
let lastPosts: PostWithID[] | null = null;
let lastResult: PostWithID[] = [];

export function locallyFilterPostsMemo(
  posts: PostWithID[],
  filters: PostQueryFilters
): PostWithID[] {
  if (
    lastFilters &&
    lastPosts &&
    shallowEqualFilters(filters, lastFilters) &&
    posts === lastPosts
  ) {
    return lastResult;
  }

  const result = locallyFilterPosts(posts, filters); // raw version
  lastFilters = filters;
  lastPosts = posts;
  lastResult = result;
  return result;
}

function shallowEqualFilters(
  a: PostQueryFilters,
  b: PostQueryFilters
): boolean {
  return JSON.stringify(a) === JSON.stringify(b); // quick & dirty for now
}

export function locallyFilterPosts(
  posts: PostWithID[],
  filters: PostQueryFilters
): PostWithID[] {
  return posts.filter((post) => {
    // Hashtag (match any)
    if (filters.hashtag) {
      const tag = filters.hashtag.toLowerCase();
      if (!post.hashtags?.some((t) => t.toLowerCase() === tag)) return false;
    }

    // StarTag (match any)
    if (filters.starTag) {
      const tag = filters.starTag.toLowerCase();
      if (!post.starTags?.some((t) => t.toLowerCase() === tag)) return false;
    }

    // Created By
    if (filters.postUserUid && post.postUserUid !== filters.postUserUid) {
      return false;
    }

    // Goal
    if (filters.companyGoalId && post.companyGoalId !== filters.companyGoalId) {
      return false;
    }

    if (
      filters.brand &&
      !post.brands?.some(
        (b) => normalizeBrand(b) === normalizeBrand(filters.brand!)
      )
    ) {
      return false;
    }

    if (
      filters.productType &&
      !post.productType?.includes(filters.productType)
    ) {
      return false;
    }

    // Account Info
    if (
      filters.accountName &&
      !post.accountName
        ?.toLowerCase()
        .includes(filters.accountName.toLowerCase())
    )
      return false;

    if (filters.accountNumber && post.accountNumber !== filters.accountNumber)
      return false;

    if (filters.accountType && post.accountType !== filters.accountType)
      return false;

    if (filters.accountChain && post.chain !== filters.accountChain)
      return false;

    if (filters.chainType && post.chainType !== filters.chainType) return false;

    // State / City
    if (
      filters.states &&
      filters.states.length > 0 &&
      !filters.states.includes(post.state) // Argument of type 'string | undefined' is not assignable to parameter of type 'string'
    )
      return false;

    if (filters.minCaseCount !== null && filters.minCaseCount !== undefined) {
      if (!post.totalCaseCount || post.totalCaseCount < filters.minCaseCount) {
        return false;
      }
    }

    if (filters.minCaseCount !== null && filters.minCaseCount !== undefined) {
      if (!post.totalCaseCount || post.totalCaseCount < filters.minCaseCount) {
        return false;
      }
    }

    if (
      filters.cities &&
      filters.cities.length > 0 &&
      !filters.cities.includes(post.city) // Argument of type 'string | undefined' is not assignable to parameter of type 'string'
    )
      return false;

    // Date Range
    if (filters.dateRange) {
      const postDate = new Date(post.displayDate).getTime();
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
  // Step 1: Remove empty/null values
  const cleaned: Record<string, any> = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" &&
        value !== null &&
        "startDate" in value &&
        !value.startDate &&
        !value.endDate)
    ) {
      return;
    }
    cleaned[key] = value;
  });

  // Step 2: Sort keys
  const sorted: Record<string, any> = Object.fromEntries(
    Object.entries(cleaned).sort(([a], [b]) => a.localeCompare(b))
  );

  // Step 3: JSON stringify and base64 encode
  const jsonString = JSON.stringify(sorted);
  return btoa(jsonString);
}
