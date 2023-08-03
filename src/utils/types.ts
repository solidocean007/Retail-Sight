export type TUserInformation = {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
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
  cityInputError: string;
  phoneNumberInputError: string;
};