export type TUserInformation = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  password: string;
};

export type TPhoneInputState = [string, string, string];

export type TUserInputType = {
  firstNameInput: string;
  lastNameInput: string;
  emailInput: string;
  companyInput: string;
  phoneInput: TPhoneInputState;
  passwordInput: string;
  verifyPasswordInput: string;
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

// types.ts
export interface UserType {
  id: string;
  name: string;
  company: string;
  userId: string;
  email: string;
}

import { Timestamp } from "firebase/firestore";

export interface PostType {
  id: string;  // id for post
  // should there be a user id?
  description?: string;
  imageUrl?: string;
  postType?: string;
  timestamp?: Timestamp;
  user?: UserType;
}


