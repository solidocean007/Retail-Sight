// SignUpLogin.tsx
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { useNavigate } from "react-router-dom";

// Import necessary Material-UI components
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

// import items from Redux
import { useAppDispatch } from "../utils/store";
//imports for password visibility
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

// submit validation functions
import { handleSignUpSubmit, handleLoginSubmit } from "../utils/validation/validationSubmit";

//Import style sheet
import './signUpLogIn.css'
import { selectLoadingState, selectUser } from "../Slices/userSlice";

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const currentUserInRedux = useSelector(selectUser)
  const isLoading = useSelector(selectLoadingState);
  const dispatch = useAppDispatch();

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
    phoneInput: "",
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

   // Refactor to a separate function for readability
   const redirectIfLoggedIn = () => {
    if (isLoading === 'succeeded' && currentUserInRedux) {
      navigate('/userHomePage');
    }
  };

  useEffect(() => {
    redirectIfLoggedIn();
  }, [currentUserInRedux, isLoading, navigate]); // missing dependency

  if (isLoading === 'pending') {
    return <div>Loading...</div>; // Use a proper loading indicator
  }
  
  type PasswordVisibilityKey = "password" | "passwordConfirm";

  // helper functions
  const handleInputChange = (name: string, value: string) => {
    setUserInputs((prevState) => ({ ...prevState, [name]: value }));
  };

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
      phoneInput: "",
      passwordInput: "",
      verifyPasswordInput: "",
    });
  }

  function formButtonMessage() {
    return isSignUp ? "switch to login" : "switch to sign-up";
  }

  const setFormMode = () => setIsSignUp((prevIsSignUp) => !prevIsSignUp);

  const onSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTriedSubmit(true);
    try {
      if (isSignUp) {
        await handleSignUpSubmit(userInputs, setErrorsOfInputs, setSignUpError, dispatch, navigate);
      } else {
        await handleLoginSubmit(userInputs, dispatch, navigate);
      }
    } catch (error) {

      console.error('An error occurred during form submission:', error);
    } finally {
      resetForm(); // Reset the form after submission attempt
    }
  };
  

  return (
    <div className="outer-container">
       <Container className="sign-up-container" component="main" maxWidth="xs">
      <Typography variant="h5">{isSignUp ? "Sign Up" : "Log In"}</Typography>
      <Button variant="contained" color="primary" onClick={setFormMode}>
        {formButtonMessage()}
      </Button>
      <form noValidate onSubmit={onSubmit}>
        <div className="signUp-login-form">
          {isSignUp ? (
            <>
              <Container>
                <TextField
                  className="sign-up-text-field"
                  label="First Name"
                  name="firstNameInput"
                  value={userInputs.firstNameInput}
                  onChange={(e) =>
                    handleInputChange("firstNameInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.firstNameInputError}
                  show={
                    triedSubmit && errorsOfInputs.firstNameInputError.length > 0
                  }
                />

                <TextField
                  label="Last Name"
                  name="lastNameInput"
                  value={userInputs.lastNameInput}
                  onChange={(e) =>
                    handleInputChange("lastNameInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.lastNameInputError}
                  show={
                    triedSubmit && errorsOfInputs.lastNameInputError.length > 0
                  }
                />

                <TextField
                  label="Email"
                  name="emailInput"
                  value={userInputs.emailInput}
                  onChange={(e) =>
                    handleInputChange("emailInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.emailInputError}
                  show={
                    triedSubmit && errorsOfInputs.emailInputError.length > 0
                  }
                />

                <TextField
                  label="Company"
                  name="companyInput"
                  value={userInputs.companyInput}
                  onChange={(e) =>
                    handleInputChange("companyInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.companyInputError}
                  show={
                    triedSubmit && errorsOfInputs.companyInputError.length > 0
                  }
                />

                <TextField
                  label="Phone Number"
                  name="phoneInput"
                  value={userInputs.phoneInput}
                  onChange={(e) =>
                    handleInputChange("phoneInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.phoneInputError}
                  show={
                    triedSubmit && errorsOfInputs.phoneInputError.length > 0
                  }
                />

                <TextField
                  label="Password"
                  name="passwordInput"
                  value={userInputs.passwordInput}
                  type={passwordVisibility.password ? "text" : "password"}
                  onChange={(e) =>
                    handleInputChange("passwordInput", e.target.value)
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility("password")}
                        >
                          {passwordVisibility.password ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <ErrorMessage
                  message={errorsOfInputs.passwordInputError}
                  show={
                    triedSubmit && errorsOfInputs.passwordInputError.length > 0
                  }
                />

                <TextField
                  label="Verify Password"
                  name="verifyPasswordInput"
                  value={userInputs.verifyPasswordInput}
                  type={passwordVisibility.password ? "text" : "password"}
                  onChange={(e) =>
                    handleInputChange("verifyPasswordInput", e.target.value)
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility("password")}
                        >
                          {passwordVisibility.passwordConfirm ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <ErrorMessage
                  message={errorsOfInputs.verifyPasswordInputError}
                  show={
                    triedSubmit &&
                    errorsOfInputs.verifyPasswordInputError.length > 0
                  }
                />
              </Container>
            </>
          ) : (
            <>
              <Container>
                <TextField
                  label="Email"
                  name="emailInput"
                  value={userInputs.emailInput}
                  onChange={(e) =>
                    handleInputChange("emailInput", e.target.value)
                  }
                />
                <ErrorMessage
                  message={errorsOfInputs.emailInputError}
                  show={
                    triedSubmit && errorsOfInputs.firstNameInputError.length > 0
                  }
                />
                <TextField
                  label="Password"
                  name="passwordInput"
                  value={userInputs.passwordInput}
                  type={passwordVisibility.password ? "text" : "password"}
                  onChange={(e) =>
                    handleInputChange("passwordInput", e.target.value)
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => togglePasswordVisibility("password")}
                        >
                          {passwordVisibility.password ? (
                            <Visibility />
                          ) : (
                            <VisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <ErrorMessage
                  message={errorsOfInputs.passwordInputError}
                  show={
                    triedSubmit && errorsOfInputs.passwordInputError.length > 0
                  }
                />
              </Container>
            </>
          )}
        </div>
        {signUpError && <div className="error">{signUpError}</div>}
        <Button type="submit" variant="contained" color="primary">
          Submit
        </Button>
      </form>
    </Container>
    </div>
  );
};