// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { serverTimestamp, Timestamp } from "firebase/firestore";
// import { ChannelType } from "../components/Create-Post/ChannelSelector";
// import { CategoryType } from "../components/Create-Post/CategorySelector";

export type CompanyType = {
  lastUpdated: string;
  companyName: string;
  altCompanyNames: string[];
  superAdminsUsers: string[];
  adminsUsers: string[];
  employeeUsers: string[];
  statusPendingUsers: string[];
  companyVerified: boolean;
  createdAt: string;
  accountsId: string | null;
  goals: CompanyGoalWithIdType[];
};

export type TUserInputType = {
  firstNameInput: string;
  lastNameInput: string;
  emailInput: string;
  companyInput: string;
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
  firstName: string | undefined; // from signup
  lastName: string | undefined; // from signup
  profileUrlThumbnail?: string;
  profileUrlOriginal?: string;
  email: string | undefined; // from signup
  company: string;
  companyId: string;
  salesRouteNum: string | undefined;
  phone: string | undefined; // from signup
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
  // category: CategoryType;
  // channel: ChannelType;
  hashtags: string[];
  starTags: string[];
  productType?: string[];
  productNames?: string[];
  brands?: string[];
  supplier?: string;

  account: CompanyAccountType;

  // 🧾 Account Info
  accountNumber?: string;
  accountName?: string;
  accountAddress?: string;
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
  photos?: { file: string }[];
  totalCaseCount: number;
  commentCount: number;
  likes?: string[];

  // 🗓 Timing
  displayDate: string;
  timestamp: string;
  visibility: "public" | "company" | "supplier" | "private";

  // 🎯 Goals
  companyGoalId?: string | null;
  companyGoalTitle?: string | null;
  companyGoalDescription?: string | null;
  galloGoalTitle?: string | null;
  galloGoalDescription?: string | null;
  oppId?: string | null;

  // 🧾 Closure Info
  closedBy?: string;
  closedDate?: string;
  closedUnits?: string | number;

  // 🔐 Tokens
  tokens?: PostTokenType[];
}

export type PostInputType = {
  description: string;
  imageUrl?: string;
  totalCaseCount: number;
  visibility: string;

  postUser: UserType | null;
  account: CompanyAccountType | null;

  // Optional extras
  postedBy?: UserType | null;

  // Optional fields for editing or viewing
  companyGoalId?: string | null;
  companyGoalTitle?: string | null;
  companyGoalDescription?: string | null;

  galloGoalTitle?: string | null;
  galloGoalDescription?: string | null;
  closedBy?: string | null;
  closedDate?: string;
  closedUnits?: string | number;
  oppId?: string | null;

  // Raw arrays (not flattened)
  hashtags?: string[];
  starTags?: string[];
  brands?: string[];
  productType?: string[];
  productNames?: string[];
  supplier?: string;

  // UI-local fields — no need to flatten anything yet
};

export type PostWithID = PostType & { id: string };

export type FirestorePostPayload = Omit<
  PostType,
  "displayDate" | "timestamp"
> & {
  displayDate: Date | ReturnType<typeof serverTimestamp> | Timestamp;
  timestamp: Date | ReturnType<typeof serverTimestamp> | Timestamp;
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

export type GoalTargetMode =
  | "goalForAllAccounts"
  | "goalForSelectedAccounts"
  | "goalForSelectedUsers";

export type CompanyGoalType = {
  companyId: string;
  goalTitle: string;
  goalDescription: string;
  goalMetric: string;
  goalValueMin: number;
  goalStartDate: string;
  goalEndDate: string;
  createdAt: string; // ISO string
  createdByUserId?: string; // optional
  createdByFirstName?: string; // optional
  createdByLastName?: string; // optional
  accountNumbersForThisGoal: string[]; // ✅ Full scope of accounts this goal applies to
  perUserQuota?: number; // ✅ Minimum required submissions per user (if defined)
  submittedPosts?: GoalSubmissionType[];
};

export type CompanyGoalWithIdType = CompanyGoalType & { id: string };

export type GoalSubmissionType = {
  postId: string;
  account: CompanyAccountType;
  submittedBy: UserType;
  submittedAt: string;
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
    salesRouteNums?: string[];
    marketId?: string;
    submittedPostId?: string;
  }>;
}

export type CompanyAccountType = {
  accountNumber: string;
  accountName: string;
  accountAddress: string;
  salesRouteNums: string[];
  // city?: string;
  // zipCode?: string;
  typeOfAccount?: string;
  chain?: string; // e.g., "Food Lion" or "Walmart" or "Target"
  chainType?: "chain" | "independent"; // e.g., "Chain" or "Independent"
};

export type EnrichedGalloAccountType = GalloAccountType & {
  accountName?: string; // Optional, because not all Gallo accounts may have a Firestore match
  accountAddress?: string;
  salesRouteNums?: string[]; // Optional, same reason
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
  | "TeamMode"
  | "UsersMode"
  | "AccountsMode"
  | "ProductsMode"
  | "MyGoalsMode"
  | "ProfileMode"
  | "IntegrationMode"
  | "GoalManagerMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";
