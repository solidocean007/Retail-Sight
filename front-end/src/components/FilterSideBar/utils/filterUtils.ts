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
  if (filters.brand) parts.push(`Brand: ${filters.brand}`);
  if (filters.productType) parts.push(`Product: ${filters.productType}`);

  if (filters.accountName) parts.push(`Store: ${filters.accountName}`);
  if (filters.accountType) parts.push(`Type: ${filters.accountType}`);
  if (filters.accountChain) parts.push(`Chain: ${filters.accountChain}`);
  if (filters.chainType) parts.push(`Chain Type: ${filters.chainType}`);

  if (filters.states?.length)
    parts.push(`States: ${filters.states.join(", ")}`);
  if (filters.cities?.length)
    parts.push(`Cities: ${filters.cities.join(", ")}`);

  if (filters.minCaseCount != null)
    parts.push(`≥ ${filters.minCaseCount} cases`);

  if (filters.postUserUid) {
    const u = users.find((x) => x.uid === filters.postUserUid);
    parts.push(u ? `${u.firstName} ${u.lastName}` : filters.postUserUid);
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
        : `Date: ${start || end}`
    );
  }

  return parts.length > 0 ? parts.join(" • ") : "";
};

export function removeFilterField(
  filters: PostQueryFilters,
  field: keyof PostQueryFilters,
  valueToRemove?: string
): PostQueryFilters {
  if (field === "dateRange") {
    return { ...filters, dateRange: { startDate: null, endDate: null } };
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

  const current = filters[field];

  if (Array.isArray(current) && valueToRemove) {
    return {
      ...filters,
      [field]: current.filter((val) => val !== valueToRemove),
    };
  }

  // Reset based on type
  if (Array.isArray(current)) {
    return { ...filters, [field]: [] };
  }

  if (typeof current === "object" && !Array.isArray(current)) {
    return { ...filters, [field]: null };
  }

  return { ...filters, [field]: null };
}

export function clearAllFilters(): PostQueryFilters {
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
    productType: null,
    companyGoalId: null,
    companyGoalTitle: null,

    // ✅ ADD THESE
    galloGoalId: null,
    galloGoalTitle: null,

    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
    minCaseCount: null, // 👈 add missing
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
    deepEqualFilters(filters, lastFilters) &&
    posts === lastPosts
  ) {
    return lastResult;
  }

  const result = locallyFilterPosts(posts, filters); // raw version
  lastFilters = structuredClone(filters);

  lastPosts = posts;
  lastResult = result;
  return result;
}

function deepEqualFilters(a: PostQueryFilters, b: PostQueryFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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

    // ✅ Gallo Goal
    if (filters.galloGoalId && post.galloGoal?.goalId !== filters.galloGoalId) {
      return false;
    }
    if (filters.galloGoalTitle && !filters.galloGoalId) {
      // added this but have no idea what it means
      console.warn("Gallo goal title without ID — hash may collide");
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

    if (filters.minCaseCount !== null && filters.minCaseCount !== undefined) {
      if (!post.totalCaseCount || post.totalCaseCount < filters.minCaseCount) {
        return false;
      }
    }

    // State / City
    if (
      filters.states &&
      filters.states.length > 0 &&
      (!post.state || !filters.states.includes(post.state))
    ) {
      return false;
    }

    if (
      filters.cities &&
      filters.cities.length > 0 &&
      (!post.city || !filters.cities.includes(post.city))
    ) {
      return false;
    }

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

// export function getFilterHash(filters: PostQueryFilters): string {
//   // Step 1: Remove empty/null values
//   const cleaned: Record<string, any> = {};

//   Object.entries(filters).forEach(([key, value]) => {
//     if (
//       value === null ||
//       value === undefined ||
//       (typeof value === "string" && value.trim() === "") ||
//       (Array.isArray(value) && value.length === 0) ||
//       (typeof value === "object" &&
//         value !== null &&
//         "startDate" in value &&
//         !value.startDate &&
//         !value.endDate)
//     ) {
//       return;
//     }
//     cleaned[key] = value;
//   });

//   cleaned.companyGoalId = filters.companyGoalId ?? null;
//   cleaned.galloGoalId = filters.galloGoalId ?? null;

//   // Step 2: Sort keys
//   const sorted: Record<string, any> = Object.fromEntries(
//     Object.entries(cleaned).sort(([a], [b]) => a.localeCompare(b))
//   );

//   // Step 3: JSON stringify and base64 encode
//   const jsonString = JSON.stringify(sorted);
//   return btoa(jsonString);
// }

export function getFilterHash(filters: PostQueryFilters): string {
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

  const sorted = Object.fromEntries(
    Object.entries(cleaned).sort(([a], [b]) => a.localeCompare(b))
  );

  const json = JSON.stringify(sorted);

  // ✅ Unicode-safe base64
  return base64EncodeUnicode(json);
}

/** ✅ SAFE for Unicode */
function base64EncodeUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

export function doesPostMatchFilter(
  post: PostWithID,
  filter: PostQueryFilters
): boolean {
  // locallyFilterPosts expects an array
  return locallyFilterPosts([post], filter).length > 0;
}
