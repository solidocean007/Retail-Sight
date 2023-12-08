// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { Timestamp } from "firebase/firestore";
import { ChannelType } from "../components/ChannelSelector";
import { CategoryType } from "../components/CategorySelector";

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
  uid: string | undefined; // from Firebase
  firstName: string | undefined; // from signup
  lastName: string | undefined; // from signup
  email: string | undefined; // from signup
  company: string | undefined; // from signup
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
  // id: string;
  category: CategoryType | '';
  channel: ChannelType | '';
  description?: string;
  imageUrl?: string;
  selectedStore?: string;
  storeAddress: string;
  state?: string;  // Added state
  city?: string;   // Added city
  visibility?: 'public' | 'company' | 'supplier' | 'private';
  timestamp?: string;
  user: {
    postUserName: string | undefined;
    postUserId: string | undefined;
    postUserCompany: string | undefined;
  };
  supplier?: string;
  brands: string[];
  likes?: string[];
  hashtags: string[];
  commentCount: number;
}

export type PostWithID = PostType & { id: string };

export interface CommentType {
  commentId: string;
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


