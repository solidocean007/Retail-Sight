// export type TPhoneInputState = [string, string, string]; // going to change this to one string

import { Timestamp } from "firebase/firestore";

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

export type ChannelType =
  | "Grocery"
  | "Convenience"
  | "Restaurant"
  | "Warehouse Club"
  | "Department Store"
  | "Drug Store"
  | "Bar";

export type CategoryType =
  | "Water"
  | "Wine"
  | "Beer"
  | "Soda"
  | "Chips"
  | "Produce"
  | "Dairy"
  | "Meat"
  | "Cookies and Pastries"

export interface PostType {
  id: string;
  category: CategoryType | '';
  channel: ChannelType | '';
  description?: string;
  imageUrl?: string;
  selectedStore?: string;
  storeAddress: string;
  postType?: string;
  timestamp?: string;
  user: {
    postUserName: string | undefined;
    postUserId: string | undefined;
    postUserCompany: string | undefined;
  };
  likes?: number;
  hashtags: string[];
  commentCount: number;
}

export interface CommentType {
  commentId: string;
  text: string;
  userId: string | undefined;
  userName: string;
  postId: string;
  timestamp: Timestamp | undefined;
  likes: string[];
}
