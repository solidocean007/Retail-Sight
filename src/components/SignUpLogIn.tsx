import { useState } from "react";
import { TErrorsOfInputs, TUserInputType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { handleSignUp, handleLogin } from "../utils/authenticate";
import { useNavigate } from "react-router-dom";

// Import necessary Material-UI components
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/system";
// import { makeStyles } from "@mui/material";
// import items from Redux
import { useDispatch, useSelector } from "react-redux";
import { incrementRead } from "../Slices/firestoreReadsSlice"; // no exported incrementWrite in store
import { setUser } from "../Slices/userSlice";

//imports for password visibility
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

//Import validation
import { validateUserInputs } from "../utils/validations";

// const useStyles = makeStyles((theme) => ({
//   textField: {
//     margin: theme.spacing(1),
//     width: "25ch",
//   },
// }));

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // const classes = useStyles();

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
      phoneInput: "",
      passwordInput: "",
      verifyPasswordInput: "",
    });
  }

  function formButtonMessage() {
    return isSignUp ? "switch to login" : "switch to sign-up";
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
    e.preventDefault(); // prevent refresh
    setTriedSubmit(true); // set tried attempt to true

    if (isSignUp) {
      // checks if this is a signup
      const validationErrors = validateUserInputs(userInputs); // sets any errors to variable
      setErrorsOfInputs(validationErrors); // sets state of errors
      const firstError = Object.values(validationErrors).find(
        // finds first error
        (error: string) => error !== ""
      );

      if (firstError) {
        // sets alert to first error
        alert(`Bad data input: ${firstError}`); // use he snackbar somehow??
        return; // quits onSubmit here
      }

      try {
        // begins signup
        const authData = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailInput,
          companyInput,
          phoneInput,
          passwordInput,
          setSignUpError // do I need this?
        );

        if (authData && authData.uid) {
          // Extract relevant properties from authData.user
          const userData = {
            uid: authData.uid,
            firstName: authData.firstName, // does not exsist on type User.
            lastName: authData.lastName, // does not exsist on type User.
            company: authData.comapny, // does not exsist on type User.
            phone: authData.phoneNumber,
            email: authData.email,
            displayName: authData.displayName,
            emailVerified: authData.emailVerified,
            // Add any other properties you want to store
          };
          dispatch(setUser(userData)); // Types of property 'email' are incompatible.
          // Type 'string | null' is not assignable to type 'string'.
          //   Type 'null' is not assignable to type 'string'.ts
        }

        console.log("Sign-up successful");
        navigate("/userHomePage");
      } catch (error) {
        // signup wasnt successful
        console.error("Error during sign-up:", error);
      }
    } else {
      try {
        // begin login.
        const authData = await handleLogin(emailInput, passwordInput); // attempt to login

        if (authData && authData.uid) {
          // why check for both?
          // Extract relevant properties from authData
          const userData = {
            uid: authData.uid,
            firstName: authData.firstName, // does not exsist on type User.
            lastName: authData.lastName, // does not exsist on type User.
            company: authData.comapny, // does not exsist on type User.
            phone: authData.phoneNumber,
            email: authData.email,
            displayName: authData.displayName,
            emailVerified: authData.emailVerified,
          };
          dispatch(setUser(userData)); // Types of property 'email' are incompatible.
          // Type 'string | null' is not assignable to type 'string'.
          //   Type 'null' is not assignable to type 'string'.ts
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
    <Container component="main" maxWidth="xs">
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
            // Code for the login form can be added here
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
  );
};
