// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { serverTimestamp, Timestamp } from "firebase/firestore";
import { FieldValue } from "react-hook-form";
// import { ChannelType } from "../components/Create-Post/ChannelSelector";
// import { CategoryType } from "../components/Create-Post/CategorySelector";
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
export type AccessStatus = "active" | "suspended";

export type ProviderKey = "gallo" | "manualGoals"; // extend later

export type IntegrationConfig = {
  enabled: boolean;
  apiKeyId?: string; // reference/id (not the raw secret)
  settings?: Record<string, unknown>;
};

export type IntegrationsMap = Partial<Record<ProviderKey, IntegrationConfig>>;

export type CompanyType = {
  id?: string;
  lastUpdated: string | null;
  companyName: string;
  primaryContact?: { name?: string; email?: string; phone?: string };
  altCompanyNames?: string[]; // not necessary
  superAdminsUsers?: string[]; // not necessary
  adminsUsers?: string[]; // not necessary
  employeeUsers?: string[]; // not necessary
  statusPendingUsers?: string[]; // not necessary
  companyVerified?: boolean; // not necessary
  createdAt?: string | null;
  accountsId?: string | null; // this is null to begin with but after onboarding i think
  goals?: CompanyGoalWithIdType[];
  companyType: BusinessType; // my the developer is the owner of displaygram

  // new fields in branch: fix-creating-new-company
  verified: boolean;
  accessStatus?: AccessStatus;
  tier: "free" | "pro" | "enterprise"; // not even sure what enterprise is for.  maybe different prices for different tiers
  limits: {
    // this i understand well.  i have an idea that companies will have user and connection limits for their paid or free plans
    maxUsers: number;
    maxConnections: number;
  };
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
export interface ConnectionRequest {
  emailLower: string;
  requestFromCompanyType: "supplier" | "distributor";
  requestFromCompanyId: string;
  requestFromCompanyName: string;
  requestToCompanyId: string;
  requestToCompanyType: string;
  requestToCompanyName: string;
  requestedByUid: string;
  status: "pending" | "approved" | "rejected";
  sharedBrands: string[];
  requestedAt?: Timestamp | string | null;
  requestedEmail?: string; // optional temporary field
}

export interface PendingBrandType {
  brand: string;
  proposedBy: string;
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
  rawCandiates?: string[];
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
  galloGoalTitle?: string;
  galloGoalId?: string;
  oppId?: string;

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

  galloGoalTitle?: string;
  galloGoalId?: string;
  closedBy?: string | null | undefined;
  closedDate?: string;
  closedUnits?: string | number;
  oppId?: string;

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

// this is a goal for a program as defined by Gallo
export type GalloGoalType = {
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
  oppId: string;
  marketId: string;
  goalId: string;
  distributorAcctId: string;
  tdlnxAcctId: string;
  galloAcctId: string;
  liquorStateAcctId: string;
};

export interface FireStoreGalloGoalDocType {
  companyId: string;
  programDetails: {
    programId: string;
    programTitle: string;
    programStartDate: string;
    programEndDate: string;
    programDisplayDate?: string;
  };
  goalDetails: {
    goalId: string; // Firestore document ID
    goal: string;
    goalMetric: string;
    goalValueMin: string;
  };
  accounts: Array<{
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
  | "UsersMode"
  | "UsersMode2"
  | "AccountsMode"
  | "ProductsMode"
  | "MyAccountsMode"
  | "MyGoalsMode"
  | "ProfileMode"
  | "IntegrationMode"
  | "GoalManagerMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";
