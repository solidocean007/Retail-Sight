import { useState } from "react";
import { UserInput } from "./UserInput";
import { UserPhoneInput } from "./UserPhoneInput";
import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { handleSignUp, handleLogin } from "../utils/authenticate";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
// Import necessary Material-UI components
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
// import items from Redux
import { useDispatch, useSelector } from "react-redux";
import { incrementRead } from "../Slices/firestoreReadsSlice"; // no exported incrementWrite in store
import { setUser } from "../Slices/userSlice";

//Import validation
import { validateUserInputs } from "../utils/validations";

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State
  const [signUpError, setSignUpError] = useState("");
  const [logInError, setLogInError] = useState(""); // not used going to eventually make a logIn component
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
    phoneInput: ["", "", ""], // going to change this to one string
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

  type InputKey =  // not sure what these key types are for
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
      phoneInput: ["", "", ""], // set to one string
      passwordInput: "",
      verifyPasswordInput: "",
    });
  }

  function formButtonMessage() {
    return isSignUp ? "Login" : "Sign-up";
  }

  const setFormMode = () => setIsSignUp((prevIsSignUp) => !prevIsSignUp);

  const {
    firstNameInput,
    lastNameInput,
    emailInput,
    companyInput,
    phoneInput,
    passwordInput,
  } = userInputs;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // prevent refresh
    setTriedSubmit(true);  // set tried attempt to true

    if (isSignUp) {  // checks if this is a signup
      const validationErrors = validateUserInputs(userInputs); // sets any errors to variable
      setErrorsOfInputs(validationErrors); // sets state of errors
      const firstError = Object.values(validationErrors).find(  // finds first error
        (error: string) => error !== ""
      );

      if (firstError) { // sets alert to first error
        alert(`Bad data input: ${firstError}`); // use he snackbar somehow??
        return; // quits onSubmit here
      }

      try { // begins signup
        const authData = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailInput,
          companyInput,
          phoneInput,
          passwordInput,
          setSignUpError
        );

        if (authData && authData.user && authData.user.uid) { // checks if authData and user and userid exsists, why check all three?
          // Extract relevant properties from authData.user
          const userData = {
            uid: authData.user.uid,
            email: authData.user.email,
            displayName: authData.user.displayName,
            emailVerified: authData.user.emailVerified,
            // Add any other properties you want to store
          };
          dispatch(setUser(userData)); // sets this to the store
        }

        console.log("Sign-up successful");
        navigate("/userHomePage");
      } catch (error) { // signup wasnt successful
        console.error("Error during sign-up:", error); 
      }
    } else {
      try { // begin login.
        const authData = await handleLogin(emailInput, passwordInput); // attempt to login

        if (authData && authData.uid) { // why check for both?
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
        <Button variant="contained" color="primary" onClick={setFormMode}>
          {formButtonMessage()}
        </Button>

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
                        value: userInputs[item.field],
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
      <Button type="submit" variant="contained" color="primary">
        Submit
      </Button>
    </form>
  );
};
