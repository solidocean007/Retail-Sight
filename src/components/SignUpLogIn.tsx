import { useState, useEffect } from "react";
import { UserInput } from "./UserInput";
import { UserPhoneInput } from "./UserPhoneInput";
import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { TUserInformation } from "../utils/types";
import { handleSignUp, handleLogin } from "../utils/authenticate";
import { useNavigate } from "react-router-dom";



//Import validation
import { validateUserInputs } from "../utils/validations";

export const SignUpLogin = ({
  setProfileData,
}: {
  setProfileData: (profileData: TUserInformation) => void;
}) => {
  // State
  const [signUpError, setSignUpError] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    passwordConfirm: false,
  });
  const [isSignUp, setIsSignUp] = useState(true);
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

  const navigate = useNavigate();

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

  // Array for user create account inputs
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

  const UserLoginProperties: {
    label: string;
    field: InputKey;
    errorField: ErrorKey;
  }[] = [
    { label: "Email", field: "emailInput", errorField: "emailInputError" },
    {
      label: "Password",
      field: "passwordInput",
      errorField: "passwordInputError",
    },
  ];

  const handleInputChange = (name: string, value: string) => {
    setUserInputs((prevState) => ({ ...prevState, [name]: value }));
  };

  type PasswordVisibilityKey = "password" | "passwordConfirm";

  const togglePasswordVisibility = (fieldName: PasswordVisibilityKey) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [fieldName]: !prevState[fieldName],
    }));
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

  function formButtonMessage() {
    return isSignUp ? "Login" : "Sign-up";
  }

  const setFormMode = () => setIsSignUp((prevIsSignUp) => !prevIsSignUp);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTriedSubmit(true);
        const validationErrors = validateUserInputs(userInputs);
        setErrorsOfInputs(validationErrors);

        // I don't think I need this.  Errors are already handled and displayed individually.
        const errorValues = Object.values(validationErrors);
        if (errorValues.some((error) => error !== "")) {
          alert("Bad data input", error);
          return;
        }

        // I don't know why I'm using this either If I have firestore and firebase to retrieve user info.
        const newProfileInformation: TUserInformation = {
          firstName: userInputs.firstNameInput,
          lastName: userInputs.lastNameInput,
          email: userInputs.emailInput,
          company: userInputs.companyInput,
          phone: userInputs.phoneInput.join(""),
          password: userInputs.passwordInput,
        };

        // again i might not need this
        if (Object.values(validationErrors).every((error) => error === "")) {
          setProfileData(newProfileInformation);
        }

        const { emailInput, passwordInput } = userInputs;

        if (isSignUp) {
          handleSignUp(userInputs.emailInput, userInputs.passwordInput, setSignUpError)
            .then(() => {
              navigate("/userHomePage");
            })
            .catch((error) => {
              // Handle or display error
            });
        } else {
          handleLogin(userInputs.emailInput, userInputs.passwordInput)
            .then(() => {
              navigate("/userHomePage");
            })
            .catch((error) => {
              // Handle or display error
            });
        }

        resetForm();
      }}
    >
      <div className="signUp-login-form">
        <button type="button" onClick={setFormMode}>
          {formButtonMessage()}
        </button>
        {isSignUp
          ? NewUserProperties.map((item, index) => (
              <div key={index} className="user-input-field">
                {item.field !== "phoneInput" ? (
                  <UserInput
                    labelText={item.label}
                    inputProps={{
                      type:
                        (item.field === "passwordInput" &&
                          passwordVisibility.password !== true) ||
                        (item.field === "verifyPasswordInput" &&
                          passwordVisibility.passwordConfirm !== true)
                          ? "password"
                          : "text",
                      onChange: (e) => {
                        handleInputChange(item.field, e.target.value);
                      },
                    }}
                    isPasswordField={
                      item.field === "passwordInput" ||
                      item.field === "verifyPasswordInput"
                    } // Indicates whether this is a password field
                    onToggleVisibility={
                      () =>
                        item.field === "passwordInput"
                          ? togglePasswordVisibility("password")
                          : togglePasswordVisibility("passwordConfirm") // Use correct key based on item.field
                    }
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
                  show={
                    triedSubmit && errorsOfInputs[item.errorField].length > 0
                  }
                />
              </div>
            ))
          : UserLoginProperties.map((item, index) => (
              <div key={index} className="user-input-field">
                <UserInput
                  labelText={item.label}
                  inputProps={{
                    type:
                      item.field === "passwordInput" ||
                      item.field === "verifyPasswordInput"
                        ? "password"
                        : "text",
                    onChange: (e) => {
                      handleInputChange(item.field, e.target.value);
                    },
                  }}
                />
                <ErrorMessage
                  message={errorsOfInputs[item.errorField]}
                  show={
                    triedSubmit && errorsOfInputs[item.errorField].length > 0
                  }
                />
              </div>
            ))}
      </div>
      {signUpError && <div className="error">{signUpError}</div>}
      <input type="submit" />
    </form>
  );
};
