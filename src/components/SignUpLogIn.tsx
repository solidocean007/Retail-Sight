import { useEffect, useState } from "react";
import { UserInput } from "./UserInput";
import { UserPhoneInput } from "./UserPhoneInput";
import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { handleSignUp, handleLogin } from "../utils/authenticate";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// import items from Redux
import { useDispatch } from "react-redux";
import { setUser } from "../Slices/userSlice";

//Import validation
import { validateUserInputs } from "../utils/validations";

// interface TNewUser {
//   firstName: string;
//   lastName: string;
//   email: string;
//   company: string;
//   phone: string;
//   password: string;
//   verifyPasswordInput: string;
// }

export const SignUpLogin = () => {
  // State
  const [signUpError, setSignUpError] = useState("");
  const [logInError, setLogInError] = useState("");
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

  const dispatch = useDispatch();
  const {
    firstNameInput,
    lastNameInput,
    emailInput,
    companyInput,
    phoneInput,
    passwordInput,
  } = userInputs;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (isSignUp) {
      const validationErrors = validateUserInputs(userInputs);
      setErrorsOfInputs(validationErrors);
      const firstError = Object.values(validationErrors).find(
        (error: string) => error !== ""
      );

      if (firstError) {
        alert(`Bad data input: ${firstError}`);
        return;
      }

      try {
        const authData = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailInput,
          companyInput,
          phoneInput,
          passwordInput,
          setSignUpError
        );

        if (authData && authData.uid) {
          // Extract relevant properties from authData
          const userData = {
            uid: authData.uid,
            email: authData.email,
            displayName: authData.displayName,
            emailVerified: authData.emailVerified,
            // Add any other properties you want to store
          };
          dispatch(setUser(userData));
        }

        console.log("Sign-up successful");
        navigate("/userHomePage");
      } catch (error) {
        console.error("Error during sign-up:", error);
      }
    } else {
      try {
        const authData = await handleLogin(emailInput, passwordInput);
        console.log(authData) // logging the authData to see its structure
        
        if (authData && authData.uid) {
          // Extract relevant properties from authData
          const userData = {
            uid: authData.uid,
            email: authData.email,
            displayName: authData.displayName,
            emailVerified: authData.emailVerified,
            // Add any other properties you want to store
          };
          dispatch(setUser(userData));
        }
  
        console.log("Login successful");
        navigate("/userHomePage");
      } catch (error) {
        console.error("Error during login:", error);
      }
    }

    console.log("Resetting form");
    resetForm();
  };
  
  return (
    <form noValidate onSubmit={onSubmit}>
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
                      value: userInputs[item.field],
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
                      item.field === "passwordInput" &&
                      !passwordVisibility.password
                        ? "password"
                        : "text",
                    onChange: (e) => {
                      handleInputChange(item.field, e.target.value);
                    },
                  }}
                  isPasswordField={item.field === "passwordInput"} // Indicates whether this is a password field
                  onToggleVisibility={() =>
                    togglePasswordVisibility("password")
                  }
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
