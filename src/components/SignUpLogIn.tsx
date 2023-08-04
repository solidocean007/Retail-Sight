import { useState } from "react";
import { UserInput } from "./UserInput";
import { UserPhoneInput } from "./UserPhoneInput";
import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { TUserInformation } from "../utils/types";

//Import validation
import { validateUserInputs } from "../utils/validations";

export const SignUpLogin = ({
  setProfileData,
}: {
  setProfileData: (profileData: TUserInformation) => void;
}) => {
  // State
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [userInputs, setUserInputs] = useState<TUserInputType>({
    firstNameInput: "",
    lastNameInput: "",
    emailInput: "",
    companyInput: "",
    phoneInput: ["", "", ""],
    passwordInput: "",
    verifyPasswordInput: "",
  });

  // Types Unique to this component
  const [errorsOfInputs, setErrorsOfInputs] = useState<TErrorsOfInputs>({
    firstNameInputError: "",
    lastNameInputError: "",
    emailInputError: "",
    companyInputError: "",
    phoneInputError: "",
    passwordInputError: "",
    verifyPasswordInputError: "",
  });

  // Array for user inputs
  type InputKey =
    | "firstNameInput"
    | "lastNameInput"
    | "emailInput"
    | "companyInput"
    | "phoneInput"
    | "passwordInput"
    | "verifyPasswordInput";
  type ErrorKey =
    | "firstNameInputError"
    | "lastNameInputError"
    | "emailInputError"
    | "companyInputError"
    | "phoneInputError"
    | "passwordInputError"
    | "verifyPasswordInputError";

  const NewUserProperties: {
    label: string;
    field: InputKey;
    errorField: ErrorKey;
  }[] = [
    {
      label: "First Name",
      field: "firstNameInput",
      errorField: "firstNameInputError",
    },
    {
      label: "Last Name",
      field: "lastNameInput",
      errorField: "lastNameInputError",
    },
    { label: "Email", field: "emailInput", errorField: "emailInputError" },
    {
      label: "Company",
      field: "companyInput",
      errorField: "companyInputError",
    },
    {
      label: "Phone number",
      field: "phoneInput",
      errorField: "phoneInputError",
    },
    {
      label: "Password",
      field: "passwordInput",
      errorField: "passwordInputError",
    },
    {
      label: "Verify Password",
      field: "verifyPasswordInput",
      errorField: "verifyPasswordInputError",
    },
  ];

  const handleInputChange = (name: string, value: string) => {
    setUserInputs((prevState) => ({ ...prevState, [name]: value }));
  };

  function resetForm() {
    setUserInputs({
      firstNameInput: "",
      lastNameInput: "",
      emailInput: "",
      companyInput: "",
      phoneInput: ["", "", ""],
      passwordInput: "",
      verifyPasswordInput: "",
    });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTriedSubmit(true);
        const validationErrors = validateUserInputs(userInputs);
        setErrorsOfInputs(validationErrors);

        const errorValues = Object.values(validationErrors);
        if (errorValues.some((error) => error !== "")) {
          alert("Bad data input");
          return;
        }

        const newProfileInformation: TUserInformation = {
          firstName: userInputs.firstNameInput,
          lastName: userInputs.lastNameInput,
          email: userInputs.emailInput,
          company: userInputs.companyInput,
          phone: userInputs.phoneInput.join(""),
          password: userInputs.passwordInput,
        };

        if (Object.values(validationErrors).every((error) => error === "")) {
          setProfileData(newProfileInformation);
        }
        resetForm();
      }}
    >
      <div className="signUp-login-form">
        {NewUserProperties.map((item, index) => (
          <div key={index} className="user-input-field">
            {item.field !== "phoneInput" ? (
              <UserInput
                labelText={item.label}
                inputProps={{
                  type: item.field === "passwordInput" || item.field === "verifyPasswordInput" ? "password" : "text",
                  onChange: (e) => {
                    handleInputChange(item.field, e.target.value);
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
            <ErrorMessage
              message={errorsOfInputs[item.errorField]}
              show={triedSubmit && errorsOfInputs[item.errorField].length > 0}
            />
          </div>
        ))}
      </div>
      <input type="submit" />
    </form>
  );
};
