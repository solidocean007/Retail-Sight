// src/types/library.ts

/**
 * A collection is a saved group of displays.
 * A playbook is a guided execution asset built from displays.
 *
 * For backward compatibility:
 * - missing collectionType should be treated as "collection"
 * - existing Firestore docs do not need immediate migration
 */

export type CollectionTypeValue = "collection" | "playbook";

export type PlaybookStatus = "draft" | "published" | "archived";

export type PlaybookAudience = "sales" | "supervisors" | "all";

export interface CollectionType {
  id: string;
  title: string;
  companyId: string;
  description?: string;
  ownerId: string;

  postIds: string[];
  previewImages?: string[];

  sharedWith: string[];
  shareToken?: string | null;
  isShareableOutsideCompany: boolean;

  /**
   * Undefined means old/simple collection.
   */
  collectionType?: CollectionTypeValue;

  /**
   * Playbook-only fields.
   * These should only matter when collectionType === "playbook".
   */
  playbookStatus?: PlaybookStatus;

  coachNotes?: string;
  gamePlan?: string;
  whenToUse?: string;
  executionGoal?: string;
  audience?: PlaybookAudience;

  /**
   * Optional business context for filtering and organizing playbooks.
   */
  season?: string;
  programName?: string;
  chain?: string;
  chainType?: string;
  supplierId?: string;
  brandIds?: string[];
  goalIds?: string[];

  /**
   * Display selection.
   * Keep featuredPostIds for now.
   * Add pinnedPostIds later only if you need a separate meaning.
   */
  featuredPostIds?: string[];

  /**
   * Snapshots keep playbooks stable even if the original display changes,
   * gets removed from Redux, or is unavailable during export.
   */
  playbookPostSnapshots?: PlaybookPostSnapshot[];
  featuredPostSnapshots?: PlaybookPostSnapshot[];

  createdAt?: string;
  updatedAt?: string;
}

export type CollectionWithId = CollectionType & { id: string };

export type CreateCollectionInput = {
  title: string;
  description?: string;

  postIds?: string[];
  previewImages?: string[];

  sharedWith?: string[];
  shareToken?: string | null;
  isShareableOutsideCompany?: boolean;

  collectionType?: CollectionTypeValue;

  playbookStatus?: PlaybookStatus;

  coachNotes?: string;
  gamePlan?: string;
  whenToUse?: string;
  executionGoal?: string;
  audience?: PlaybookAudience;

  season?: string;
  programName?: string;
  chain?: string;
  chainType?: string;
  supplierId?: string;
  brandIds?: string[];
  goalIds?: string[];

  featuredPostIds?: string[];

  playbookPostSnapshots?: PlaybookPostSnapshot[];
  featuredPostSnapshots?: PlaybookPostSnapshot[];
};

export interface PlaybookPostSnapshot {
  postId: string;

  imageUrl: string;
  originalImageUrl?: string;

  accountName?: string;
  accountNumber?: string;
  accountAddress?: string;
  city?: string;
  state?: string;
  chain?: string;
  chainType?: string;

  brands?: string[];
  brandIds?: string[];
  productType?: string[];

  description?: string;
  totalCaseCount?: number;

  postUserUid?: string;
  postUserFirstName?: string;
  postUserLastName?: string;
  postUserCompanyName?: string;

  displayDate?: string;
  addedToPlaybookAt?: string;

  /**
   * Playbook-specific context.
   * These explain why this display belongs in this playbook.
   */
  coachNotes?: string;
  whyThisPlayWorks?: string;
  suggestedExecution?: string;
  sortOrder?: number;
  isFeatured?: boolean;
}

/**
 * Optional interaction types.
 * You do not need to build these immediately.
 * Keep them here so the model supports the future direction.
 */

export type PlaybookExecutionStatus =
  | "not_started"
  | "reviewed"
  | "running"
  | "completed"
  | "blocked";

export interface PlaybookStats {
  viewedCount?: number;
  runningCount?: number;
  completedCount?: number;
  blockedCount?: number;
  executionPostCount?: number;
}

export interface PlaybookUserActivity {
  id: string;
  playbookId: string;
  companyId: string;
  userId: string;

  status: PlaybookExecutionStatus;

  reviewedAt?: string;
  startedAt?: string;
  completedAt?: string;
  blockedAt?: string;

  sourcePostId?: string;
  executionPostId?: string;

  feedback?: string;
  blockerReason?: string;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Helpers
 */

export const getCollectionType = (
  collection: Pick<CollectionType, "collectionType">,
): CollectionTypeValue => {
  return collection.collectionType ?? "collection";
};

export const isPlaybookCollection = (
  collection: Pick<CollectionType, "collectionType">,
): boolean => {
  return getCollectionType(collection) === "playbook";
};

export const isPublishedPlaybook = (
  collection: Pick<CollectionType, "collectionType" | "playbookStatus">,
): boolean => {
  return (
    getCollectionType(collection) === "playbook" &&
    collection.playbookStatus === "published"
  );
};


export interface PlaybookForecast {
  id: string;

  playbookId: string;
  companyId: string;

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  userSalesRouteNum?: string | number;

  accountNumber: string;
  accountName: string;
  accountAddress?: string;
  city?: string;
  state?: string;
  chain?: string;
  chainType?: string;

  estimatedCases?: number;
  estimatedUnits?: number;

  status: PlaybookForecastStatus;

  notes?: string;

  /**
   * Optional: if the rep is forecasting based on a specific display/example
   * inside the playbook.
   */
  sourcePostId?: string;

  /**
   * Optional: once they actually create a display from this play,
   * connect the forecast to the resulting post.
   */
  executionPostId?: string;

  createdAt: string;
  updatedAt?: string;
}


export type PlaybookForecastStatus =
  | "planned"
  | "pitched"
  | "approved"
  | "executed"
  | "missed";

export interface PlaybookForecast {
  id: string;

  playbookId: string;
  companyId: string;

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  userSalesRouteNum?: string | number;

  accountNumber: string;
  accountName: string;
  accountAddress?: string;
  city?: string;
  state?: string;
  chain?: string;
  chainType?: string;

  estimatedCases?: number;
  estimatedUnits?: number;

  status: PlaybookForecastStatus;

  notes?: string;
  sourcePostId?: string;
  executionPostId?: string;

  createdAt: string;
  updatedAt?: string;
}

export type CreatePlaybookForecastInput = {
  playbookId: string;
  companyId: string;

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  userSalesRouteNum?: string | number;

  accountNumber: string;
  accountName: string;
  accountAddress?: string;
  city?: string;
  state?: string;
  chain?: string;
  chainType?: string;

  estimatedCases?: number;
  estimatedUnits?: number;

  status?: PlaybookForecastStatus;

  notes?: string;
  sourcePostId?: string;
};