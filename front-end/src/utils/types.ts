// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { Timestamp } from "firebase/firestore";
import { ChannelType } from "../components/Create-Post/ChannelSelector";
import { CategoryType } from "../components/Create-Post/CategorySelector";

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
  // phoneInput: TPhoneInputState; // change this to string
  phoneInput: string; // change this to string
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
  category: CategoryType | "";
  channel: ChannelType | "";
  description?: string;
  imageUrl?: string;
  account: CompanyAccountType | null;
  // storeNumber?: string;
  city?: string; // Added city
  state?: string; // Added state
  visibility?: "public" | "company" | "supplier" | "private";
  displayDate: string;
  timestamp: string;
  totalCaseCount: number;
  createdBy: UserType;
  postedFor?: UserType;
  supplier?: string;
  brands: string[];
  product?: ProductType[];
  likes?: string[];
  hashtags: string[];
  starTags: string[];
  commentCount: number;
  tokens?: PostTokenType[];
  companyGoalId?: string | null;
  companyGoalDescription?: string | null;
  companyGoalTitle?: string | null;
  oppId?: string | null; // New key for the opportunity ID
  galloGoalDescription?: string | null;
  galloGoalTitle?: string | null;
  closedBy?: string; // New key for who closed the goal
  closedDate?: string; // New key for the date in DD-MM-YYYY format
  closedUnits?: string | number; // New key for the closed units
  photos?: { file: string }[]; // New key for the array of photos
}

export type PostWithID = PostType & { id: string };

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

// export type OldCompanyGoalType = {
//   id: string;
//   companyId: string;
//   goalTitle: string;
//   goalDescription: string;
//   goalMetric: string;
//   goalValueMin: number;
//   goalStartDate: string;
//   goalEndDate: string;
//   appliesToAllAccounts: boolean;
//   targetMode: GoalTargetMode;
//   accounts: CompanyAccountType[];
//   usersIdsOfGoal?: string[];
//   perUserQuota?: number;
//   submittedPosts?: GoalSubmissionType[];
// };

export type CompanyGoalType = {
  companyId: string;
  goalTitle: string;
  goalDescription: string;
  goalMetric: string;
  goalValueMin: number;
  goalStartDate: string;
  goalEndDate: string;
  accountNumbersForThisGoal: string[];        // ✅ Full scope of accounts this goal applies to
  perUserQuota?: number;           // ✅ Minimum required submissions per user (if defined)
  submittedPosts?: GoalSubmissionType[];
};

export type CompanyGoalWithIdType = CompanyGoalType & { id: string };



export type GoalSubmissionType = {
  postId: string;
  // accountNumber: string;
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
  | "MyGoalsMode"
  | "ProfileMode"
  | "IntegrationMode"
  | "GoalManagerMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";
