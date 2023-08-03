import { useState } from "react";
import { UserInput } from "./UserInput";
import { UserPhoneInput } from "./UserPhoneInput";
import { TErrorsOfInputs } from "../utils/types";

export const SignUpLogin = () => {
  const [userInputs, setUserInputs] = useState({
    firstNameInput: "",
    lastNameInput: "",
    emailInput: "",
    companyInput: "",
    phoneInput: ["", "", ""],
    passwordInput: "",
    verifyPasswordInput: "",
  });

  const [errorsOfInputs, setErrorsOfInputs] = useState<TErrorsOfInputs>({
    firstNameInputError: "",
    lastNameInputError: "",
    emailInputError: "",
    cityInputError: "",
    phoneNumberInputError: "",
  });

  const NewUserProperties = [
    "First Name",
    "Last Name",
    "Email",
    "Company",
    "Phone number",
    "Password",
    "Verify Password",
  ];

  const handleInputChange = (name: string, value: string) => {
    setUserInputs((prevState) => ({ ...prevState, [name]: value }));
  };

  return (
    <div className="signUp-login-form">
      {NewUserProperties.map((item, index) => (
        <div key={index}>
          {item !== "Phone number" ? (
            <UserInput
              labelText={item}
              inputProps={{
                type: "text",
                onChange: (e) => {
                  handleInputChange(item, e.target.value);
                },
              }}
            />
          ) : (
            <UserPhoneInput
              userInputs={userInputs}
              setUserInputs={setUserInputs}
              setErrorsOfInputs={setErrorsOfInputs}
            />
          )}
        </div>
      ))}
    </div>
  );
};
