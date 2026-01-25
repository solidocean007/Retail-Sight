import { serverTimestamp, Timestamp } from "firebase/firestore";
export type NotificationAudienceType = "user" | "company" | "role" | "global";

export type NotificationCategory =
  | "like"
  | "comment"
  | "system"
  | "reminder"
  | "goal"
  | "announcement";

export type PriorityType = "high" | "normal" | "low";

export type NotificationType = {
  id: string;
  title: string;
  message: string;
  sentAt: Timestamp | string;
  scheduledAt?: Timestamp | null;

  sentBy: UserType | "system";
  postId?: string;

  // 🧠 New fields for clearer targeting
  recipientUserIds?: string[];
  recipientCompanyIds?: string[];
  recipientRoles?: string[];

  audience?: NotificationAudienceType; // optional tag for UI and logic hints

  relatedPostId?: string;
  relatedGoalId?: string;
  relatedAccountNumber?: string; // optional tie to a store/account

  readBy: string[];
  pinned: boolean;
  priority: PriorityType;
  type?: NotificationCategory;
  commentId?: string;
};

export type BusinessType = "distributor" | "supplier";
export type AccessStatus = "off" | "limited" | "on";

export type ProviderKey = "galloAxis" | "manualGoals"; // extend later

export type IntegrationConfig = {
  enabled: boolean;
  env: "prod" | "dev";
  apiKeyId?: string; // reference/id (not the raw secret)
  settings?: Record<string, unknown>;
};

export type IntegrationsMap = Partial<Record<ProviderKey, IntegrationConfig>>;

export type BillingStatus = "active" | "past_due" | "canceled";

export interface CompanyAddons {
  extraUser: number;
  extraConnection: number;
}

// New
export type PlanName =
  | "free"
  | "team"
  | "network"
  | "enterprise"
  | "healy_plan";

export type PlanAddonsType = {
  extraUser: number;
  extraConnection: number;
};

// 🧩 Full plan definition
export interface PlanType {
  name: PlanName;
  braintreePlanId: string;
  description: string;
  price: number;
  connectionLimit: number;
  userLimit: number;
  features?: string[];
  addons: PlanAddonsType;
}

type PendingBillingChange = {
  nextPlanId?: string;
  nextAddons?: {
    id: string;
    quantity: number;
  }[];
  effectiveAt: Timestamp; // renewal date
};

export interface CompanyBilling {
  plan: PlanName;
  addons: CompanyAddons;
  totalMonthlyCost: number;
  braintreeCustomerId: string;
  subscriptionId: string;
  paymentStatus: BillingStatus;
  renewalDate?: Timestamp;
  lastPaymentDate?: Timestamp;
  pendingChange?: PendingBillingChange;
  cycleLockedUntil?: Timestamp;
}

export type CompanyType = {
  id?: string;
  lastUpdated: string | null;
  updatedAt?: string; // this is a safe guard where old logic was writing incorrectly. adding it here so i can safely convert to string before storing in redux
  companyName: string;
  primaryContact?: { name?: string; email?: string; phone?: string };
  altCompanyNames?: string[]; // not necessary
  superAdminsUsers?: string[]; // not necessary
  adminsUsers?: string[]; // not necessary
  employeeUsers?: string[]; // not necessary
  statusPendingUsers?: string[]; // not necessary
  companyVerified?: boolean; // not necessary
  createdAt?: string | null;
  accountsId?: string | null; // this is null to begin with but after onboarding
  goals?: CompanyGoalWithIdType[];
  companyType: BusinessType;
  customBrandLibrary?: string[];
  customProductTypeLibrary?: string[];

  verified: boolean;
  accessStatus?: AccessStatus;
  userLimit: number;
  connectionLimit: number;
  billing: CompanyBilling;

  // 🔁 replace array with a provider map
  integrations?: IntegrationsMap;

  // not sure about this object here.
  counts?: {
    usersTotal?: number;
    usersPending?: number;
    connectionsApproved?: number;
    connectionsPending?: number;
  };
};

export interface BillingLogType {
  id: string;
  companyId: string;
  companyName: string;
  plan: PlanType;
  event: "created" | "renewed" | "canceled" | "payment_failed";
  amount: number;
  timestamp: Timestamp;
}

export interface CompanyTypeWithId extends CompanyType {
  id: string;
}

export interface CompanyWithUsersAndId extends CompanyTypeWithId {
  users: UserType[];
  superAdminDetails: UserType[];
  adminDetails: UserType[];
  employeeDetails: UserType[];
  pendingDetails: UserType[];
  otherDetails?: UserType[]; // Optional for future use or undefined roles
}

// i just made this for this branch.. not sure if the shape is right.. i guess its how we get
// started
export interface brandRequestType {
  brand: string;
  proposedBy: UserType;
}
export interface ConnectionRequestType {
  requestToEmailLower: string;
  requestFromCompanyType: "supplier" | "distributor";
  requestFromCompanyId: string;
  requestFromCompanyName: string;
  requestToCompanyId: string;
  requestToCompanyType: string;
  requestToCompanyName: string;
  requestedByUid: string;
  status: "pending" | "approved" | "rejected";
  pendingBrands: brandRequestType[];
  requestedAt?: Timestamp | string | null;
  requestedEmail?: string; // optional temporary field
}

export interface PendingBrandType {
  brand: string;
  proposedBy: UserType;
}

export interface CompanyConnectionType {
  id: string;
  requestFromCompanyId: string;
  requestFromCompanyName: string;
  requestToCompanyId: string;
  requestFromCompanyType: "supplier" | "distributor";
  requestToCompanyType: "supplier" | "distributor";
  requestToCompanyName: string;
  requestedBy: string; // user UID
  status: "pending" | "approved" | "rejected" | "cancelled";
  sharedBrands: string[];
  pendingBrands?: PendingBrandType[];
  declinedBrands?: PendingBrandType[];
  requestedAt: Timestamp | string;
  approvedBy?: string; // uid of approver
  rejectionReason?: string;
}

export type TUserInputType = {
  firstNameInput: string;
  lastNameInput: string;
  emailInput: string;
  companyInput: string;
  companyTypeInput: string;
  phoneInput: string;
  passwordInput: string;
  verifyPasswordInput: string;
  setSignUpError?: (error: string) => void;
};

export type TErrorsOfInputs = {
  firstNameInputError: string;
  lastNameInputError: string;
  emailInputError: string;
  companyInputError: string;
  phoneInputError: string;
  passwordInputError: string;
  verifyPasswordInputError: string;
};

export interface UserType {
  role:
    | "admin"
    | "super-admin"
    | "employee"
    | "status-pending"
    | "developer"
    | "supervisor";
  uid: string; // from Firebase
  reportsTo?: string;
  createdAt: string | null;
  updatedAt: string | null;
  firstName: string | undefined; // from signup
  lastName: string | undefined; // from signup
  profileUrlThumbnail?: string;
  profileUrlOriginal?: string;
  email: string | undefined; // from signup
  company: string;
  companyId: string;
  salesRouteNum?: string | undefined;
  phone: string | undefined; // from signup
  status?: "active" | "inactive" | "pending"; // ✅ optional for backward compatibility
  verified?: boolean;
}

// import { Timestamp } from "firebase/firestore";

// export type ChannelType =
//   | "Grocery"
//   | "Convenience"
//   | "Restaurant"
//   | "Warehouse Club"
//   | "Department_store"
//   | "Drug Store"
//   | "Bar";

// export type CategoryType =
//   | "Water"
//   | "Wine"
//   | "Beer"
//   | "Soda"
//   | "Chips"
//   | "Produce"
//   | "Dairy"
//   | "Meat"
//   | "Cookies and Pastries"

export interface PostTokenType {
  token: { sharedToken: string; tokenExpiry?: string };
}

export interface PostType {
  // 🔍 Filtering Info
  hashtags: string[];
  starTags: string[];
  productType?: string[];
  productNames?: string[];
  brands?: string[];
  aiEnabled?: boolean;
  autoDetectedBrands?: string[];
  rawCandidates?: string[];
  supplier?: string;
  companyId: string;

  account: CompanyAccountType;

  // 🧾 Account Info
  accountNumber?: string;
  accountName?: string;
  accountAddress?: string;
  streetAddress?: string;
  accountSalesRouteNums?: string[];
  accountType?: string;
  chain?: string;
  chainType?: string;
  state?: string;
  city?: string;

  // 👤 Created By
  postUserUid: string;
  postUserFirstName?: string;
  postUserLastName?: string;
  postUserFullName?: string;
  postUserProfileUrlThumbnail?: string;
  postUserProfileUrlOriginal?: string;
  postUserEmail?: string;
  postUserCompanyId: string;
  postUserCompanyName: string;
  postUserSalesRouteNum?: string;
  postUserPhone?: string;
  postUser: UserType;
  postUserRole:
    | "admin"
    | "super-admin"
    | "employee"
    | "status-pending"
    | "developer"
    | "supervisor";

  // 🧍 Optional Poster Info
  postedBy?: UserType | null;
  postedByFirstName?: string | null;
  postedByLastName?: string | null;
  postedByUid?: string | null;

  // 📸 Post Content
  description: string;
  imageUrl?: string;
  originalImageUrl?: string;
  photos?: { file: string }[];
  totalCaseCount: number;
  commentCount: number;
  likes?: string[];

  // 🗓 Timing
  displayDate: string;
  timestamp: Timestamp;
  visibility?: "public" | "company";
  migratedVisibility: "public" | "companyOnly" | "network";
  sharedWithCompanies?: string[];

  // 🎯 Goals
  companyGoalId?: string | null;
  companyGoalTitle?: string | null;
  companyGoalDescription?: string | null;

  // gallo goals
  galloGoal?: {
    goalId: string;
    title: string;
    env: "dev" | "prod";
    oppId?: string;
  };

  // 🧾 Closure Info
  closedBy?: string | null | undefined;
  closedDate?: string;
  closedUnits?: string | number;

  // 🔐 Tokens
  tokens?: PostTokenType[];
}

export type PostInputType = {
  description: string;
  imageUrl?: string;
  originalImageUrl?: string;
  totalCaseCount: number;
  visibility?: string;
  migratedVisibility?: string;

  postUser: UserType | null;
  account: CompanyAccountType | null;

  // Optional extras
  postedBy?: UserType | null;

  // Optional fields for editing or viewing
  companyGoalId?: string | null;
  companyGoalTitle?: string | null;
  companyGoalDescription?: string | null;

  galloGoal?: {
    goalId: string;
    title: string;
    env: "dev" | "prod";
    oppId?: string;
  };

  closedBy?: string | null | undefined;
  closedDate?: string;
  closedUnits?: string | number;

  // Raw arrays (not flattened)
  hashtags?: string[];
  starTags?: string[];
  brands?: string[];
  aiEnabled?: boolean;
  autoDetectedBrands?: string[];
  rawCandidates?: string[];
  productType?: string[];
  productNames?: string[];
  supplier?: string;

  // UI-local fields — no need to flatten anything yet
};

export type PostWithID = PostType & { id: string };

export type FirestorePostPayload = Omit<
  PostType,
  "displayDate" | "timestamp" | "createdAt" | "updatedAt"
> & {
  displayDate: Date | ReturnType<typeof serverTimestamp> | Timestamp;
  timestamp: Date | ReturnType<typeof serverTimestamp> | Timestamp;
  createdAt: Date | ReturnType<typeof serverTimestamp> | Timestamp;
  updatedAt: Date | ReturnType<typeof serverTimestamp> | Timestamp;
};

export type PostQueryFilters = {
  companyId?: string | null;
  postUserUid?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  accountType?: string | null;
  accountChain?: string | null;
  chainType?: string | null;
  hashtag?: string | null;
  starTag?: string | null;
  brand?: string | null;
  productType: string | null;
  companyGoalId?: string | null;
  companyGoalTitle?: string | null;
  states?: string[] | null;
  cities?: string[] | null;
  minCaseCount?: number | null;
  dateRange?: {
    startDate?: string | null;
    endDate?: string | null;
  } | null;

  // ✅ add these
  galloGoalId?: string | null;
  galloGoalTitle?: string | null;
};

export interface ProductType {
  companyProductId: string;
  productName: string;
  package: string;
  productType: string;
  brand?: string;
  brandFamily?: string;
  productSupplier?: string;
  supplierProductNumber?: string;
}

export interface CommentType {
  commentId?: string;
  text: string;
  userId: string | undefined;
  userName: string;
  postId: string;
  timestamp: Timestamp | undefined;
  likes: string[];
}

export interface LocationOptions {
  [key: string]: string[]; // This will store states as keys and cities as arrays
}

// Define the structure of the location state, including selected state and city
export interface LocationState {
  locations: { [key: string]: string[] };
  selectedStates: string[];
  selectedCities: string[];
  loading: boolean;
  error: string | null;
}

export interface CollectionType {
  name: string;
  description?: string;
  ownerId: string;
  posts: string[];
  previewImages?: string[]; // Array of post IDs for preview images
  sharedWith: string[];
  shareToken?: string;
  isShareableOutsideCompany: boolean;
}

export type CollectionWithId = CollectionType & { id: string };

export interface TokenData {
  sharedToken: string;
  tokenExpiry?: string;
}

export interface CompanyTeamType {
  teamName: string;
  teamSupervisor: { uid: string; name: string }[];
  teamMembers: { uid: string; name: string }[];
}

export type TeamWithID = CompanyTeamType & { id: string };

export interface PermissionsType {
  apiKey: string;
  companyName: string;
  createdAt: Timestamp;
  permissions: {
    missions: {
      canRead: boolean;
      canWrite: boolean;
    };
    companyMissions: {
      canRead: boolean;
      canWrite: boolean;
    };
    submittedMissions: {
      canRead: boolean;
      canWrite: boolean;
    };
    posts: {
      canRead: boolean;
      canWrite: boolean;
    };
  };
}
export interface MissionType {
  id?: string;
  missionTitle: string;
  missionDescription?: string;
}

export interface CompanyMissionType {
  id?: string;
  missionId: string;
  companyIdAssigned: string;
  missionStart: Timestamp;
  missionEnd: Timestamp;
}

export interface SubmittedMissionType {
  id?: string;
  companyMissionId: string;
  postIdForObjective: string;
}

// this is a program as defined by Gallo
export type GalloProgramType = {
  marketId: string;
  programId: string;
  displayDate: string;
  startDate: string;
  endDate: string;
  programTitle: string;
  programDesc: string;
  priority: string;
  salesType: string;
  programType: string;
};

export type FirestoreGalloProgramType = GalloProgramType & {
  status: "active" | "expired";
  updatedAt: Timestamp;
};

// UI-level enriched type
export type DisplayGalloProgram = FirestoreGalloProgramType & {
  updatedAtMs: number;
  hasGoals: boolean;
};

// this is a goal for a program as defined by Gallo
export type GalloGoalType = {
  env?: "prod" | "dev";
  notifications?: {
    emailOnCreate?: boolean;
  };
  marketId: string;
  programId: string;
  goalId: string;
  eligiblePosition: string;
  verification: string;
  goal: string;
  goalMetric: string;
  goalValueMin: string;
  goalVerification: string;
  goalBenchMetric: string;
  goalBenchValue: string;
};

// export type GoalTargetMode =
//   | "goalForAllAccounts"
//   | "goalForSelectedAccounts"
//   | "goalForSelectedUsers";

export interface GoalAssignmentType {
  uid: string;
  accountNumber: string;
}

export type GoalNotificationConfig = {
  /**
   * If true, send a required transactional email
   * to assigned users when the goal is created.
   */
  emailOnCreate?: boolean;
};

export type GoalAcknowledgment = {
  uid: string;
  acknowledgedAt: string; // ISO
  source: "email" | "app";
};

export type CompanyGoalType = {
  companyId: string;
  goalTitle: string;
  targetRole?: "sales" | "supervisor";
  targetMode?: "goalForSelectedUsers" | "goalForAccounts";
  goalDescription: string;
  goalMetric: string;
  goalValueMin: number;
  goalStartDate: string;
  goalEndDate: string;
  createdAt: string; // ISO string
  createdByUserId?: string; // optional
  createdByFirstName?: string; // optional
  createdByLastName?: string; // optional
  accountNumbersForThisGoal?: string[]; // ✅ Full scope of accounts this goal applies to
  goalAssignments?: GoalAssignmentType[];
  perUserQuota?: number; // ✅ Minimum required submissions per user (if defined)
  submittedPosts?: GoalSubmissionType[];
  // 🔔 NEW — notification intent (policy lives elsewhere)
  notifications?: GoalNotificationConfig;
  acknowledgments?: GoalAcknowledgment[];
  deleted: boolean;
};

export type CompanyGoalWithIdType = CompanyGoalType & { id: string };

export type GoalSubmissionType = {
  postId: string;
  account: CompanyAccountType;
  submittedBy: UserType;
  submittedAt: string | Timestamp;
};

// export type GoalSubmissionType = {
//   postId: string;
//   accountNumber: string;
//   account: CompanyAccountType;
//   submittedBy: string | undefined;
//   submittedAt: string;
// }

// This is an account as defined by gallo
export type GalloAccountType = {
  status?: "active" | "inactive" | "disabled";
  oppId: string;
  marketId: string;
  goalId: string;
  distributorAcctId: string;
  tdlnxAcctId: string;
  galloAcctId: string;
  liquorStateAcctId: string;
};

export type LifecycleFilter = "active" | "archived" | "disabled" | "all";

export type GoalTimingState =
  | "scheduled" // not visible yet (displayDate in future)
  | "upcoming"  // visible, but not started
  | "current"   // live
  | "archived"; // ended


export interface FireStoreGalloGoalDocType {
  lifeCycleStatus: LifecycleFilter;
  displayDate: Timestamp | null;
  companyId: string;
  programDetails: {
    programId: string;
    programTitle: string;
    programDescription: string;
    programStartDate: string;
    programEndDate: string;
    programDisplayDate?: string;
  };
  goalDetails: {
    goalEnv: "prod" | "dev";
    goalId: string; // Firestore document ID
    goal: string;
    goalMetric: string;
    goalValueMin: string;
  };
  accounts: Array<{
    status: "active" | "inactive" | "disabled"; // just added status.  included disabled for future proofing
    oppId: string;
    distributorAcctId: string;
    accountName: string;
    accountAddress: string;
    salesRouteNums: string[];
    marketId: string;
    submittedPostId?: string;
  }>;
}

export type CompanyAccountType = {
  accountNumber: string;
  accountName: string;
  accountAddress: string;
  streetAddress: string;
  salesRouteNums: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  typeOfAccount?: string;
  chain?: string; // e.g., "Food Lion" or "Walmart" or "Target"
  chainType?: "chain" | "independent"; // e.g., "Chain" or "Independent"
  createdAt?: string;
  updatedAt?: string;
};

export type EnrichedGalloAccountType = GalloAccountType & {
  accountName?: string; // Optional, because not all Gallo accounts may have a Firestore match
  accountAddress?: string;
  salesRouteNums: string[];
  salesPersonsName?: string;
};

export type AchievementPayloadType = {
  oppId: string; // Opportunity ID
  closedBy: string | undefined; // The person who closed the goal
  closedDate: string; // Date in the format YYYY-MM-DD
  closedUnits: string | number; // Units completed
  photos: { file: string }[]; // Array of objects with a file property
};

export type DashboardModeType =
  | "ConnectionsMode"
  | "TeamMode"
  | "NotificationsMode"
  | "UsersMode"
  | "UsersMode2"
  | "AccountsMode"
  | "ProductsMode"
  | "MyAccountsMode"
  | "MyGoalsMode"
  | "ProfileMode"
  | "IntegrationsMode"
  | "GoalManagerMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";
