// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { Timestamp } from "firebase/firestore";
import { ChannelType } from "../components/ChannelSelector";
import { CategoryType } from "../components/CategorySelector";

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
  role: "admin" | "super-admin" | "employee" | "status-pending" | "developer";
  uid: string; // from Firebase
  firstName: string | undefined; // from signup
  lastName: string | undefined; // from signup
  email: string | undefined; // from signup
  company: string | undefined; // from signup
  companyId: string | undefined;
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

export interface PostType {
  category: CategoryType | "";
  channel: ChannelType | "";
  description?: string;
  imageUrl?: string;
  selectedStore?: string;
  storeNumber?: string;
  storeAddress: string;
  city?: string; // Added city
  state?: string; // Added state
  visibility?: "public" | "company" | "supplier" | "private";
  displayDate: string;
  timestamp: string;
  totalCaseCount: number;
  postUserName: string | undefined;
  postUserId: string | undefined;
  postUserCompany: string | undefined;
  postUserCompanyId: string | undefined;
  postUserEmail: string | undefined; // Added email
  supplier?: string;
  brands: string[];
  likes?: string[];
  hashtags: string[];
  starTags: string[];
  commentCount: number;
  token: { sharedToken: string, tokenExpiry: string };
}

export type PostWithID = PostType & { id: string };

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
  tokenExpiry: string;
}

export interface CompanyTeamType {
  teamName: string;
  teamSupervisor: {uid: string; name: string;}[];
  teamMembers: { uid: string; name: string; }[];
}

export type TeamWithID = CompanyTeamType & { id: string };

export interface PermissionsType {
  apiKey: string,
  companyName: string,
  createdAt: Timestamp,
  permissions: {
    missions: {
      canRead: boolean,
      canWrite: boolean
    },
    companyMissions: {
      canRead: boolean,
      canWrite: boolean
    },
    submittedMissions: {
      canRead: boolean,
      canWrite: boolean
    }
  }
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
