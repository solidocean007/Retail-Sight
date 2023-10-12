

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
  uid: string; // from Firebase
  firstName: string; // from signup
  lastName: string; // from signup
  email: string; // from signup
  company: string; // from signup
  phone: string; // from signup
}

// import { Timestamp } from "firebase/firestore";

export interface PostType {
  id: string;
  description?: string;
  imageUrl?: string;
  selectedStore?: string;
  storeAddress: string;
  postType?: string;
  timestamp?: string;
  userName: string;
  user: {
    postUserName: string;
    postUserId: string;
    postUserCompany: string;
  }
  likes?: number;
  hashtags: [];
  commentCount: number;
}

export interface CommentType {
  text: string;
  userId: string | undefined;
  userName: string;
  timestamp: number;
  likes: string[];
}
