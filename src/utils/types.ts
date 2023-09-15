export type TUserInformation = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  password: string;
};

export type TPhoneInputState = [string, string, string]; // going to change this to one string

export type TUserInputType = {
  firstNameInput: string;
  lastNameInput: string;
  emailInput: string;
  companyInput: string;
  phoneInput: TPhoneInputState; // change this to string
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
  id: string;
  name: string;
  company: string;
  userId: string;
  email: string;
}

import { Timestamp } from "firebase/firestore";

export interface PostType {
  id: string;
  description?: string;
  imageUrl?: string;
  postType?: string;
  timestamp?: Timestamp;
  user?: UserType;
}
