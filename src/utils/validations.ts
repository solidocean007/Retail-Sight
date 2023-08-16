import { TUserInputType } from "./types";
import { TPhoneInputState } from "./types";
import { TErrorsOfInputs } from "./types";

export function isEmailValid(emailAddress: string) {
  // eslint-disable-next-line no-useless-escape
  const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return !!emailAddress.match(regex);
}

export const isPhoneValid = (userPhoneInput: TPhoneInputState) => {
  const phoneNumberString = userPhoneInput.join("");
  if (phoneNumberString.length >= 10 && phoneNumberString.length <= 11) {
    return true;
  } else {
    return /^\d{10}$/.test(phoneNumberString);
  }
};


export const isPasswordGood = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}


export const validateUserInputs = (
  userInputs: TUserInputType
): TErrorsOfInputs => {
  const errors: TErrorsOfInputs = {
    firstNameInputError: "",
    lastNameInputError: "",
    emailInputError: "",
    companyInputError: "",
    phoneInputError: "",
    passwordInputError: "",
    verifyPasswordInputError: "",
  };

  if (
    userInputs.firstNameInput.length < 2 ||
    userInputs.firstNameInput === ""
  ) {
    errors.firstNameInputError =
      "First name must be at least 2 characters long";
  }

  if (userInputs.lastNameInput.length < 2 || userInputs.lastNameInput === "") {
    errors.lastNameInputError = "Last name must be at least 2 characters long";
  }

  if (
    !isEmailValid(userInputs.emailInput) ||
    userInputs.emailInput === ""
  ) {
    errors.emailInputError = "Email is Invalid";
  }

  if (!isPhoneValid(userInputs.phoneInput)) {
    errors.phoneInputError = "Phone Number is Invalid";
  }

  if(!isPasswordGood(userInputs.passwordInput)){
    errors.passwordInputError = "Password must contain at least 8 characters, including at least one letter and one number"
  }

  if(!isPasswordGood(userInputs.verifyPasswordInput)){
    errors.verifyPasswordInputError = "Password must contain at least 8 characters, including at least one letter and one number"
  }

  if (userInputs.passwordInput !== userInputs.verifyPasswordInput) {
    errors.verifyPasswordInputError = "Passwords do not match";
  }

  return errors;
};
