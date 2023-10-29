import { useState } from "react";
import { TErrorsOfInputs, TUserInputType, UserType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { handleSignUp, handleLogin } from "../utils/validation/authenticate";
import { useNavigate } from "react-router-dom";
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";

// Import necessary Material-UI components
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
// import { makeStyles } from "@mui/material";
// import items from Redux
import { useDispatch } from "react-redux";
// import { incrementRead } from "../Slices/firestoreReadsSlice";
import { setUser } from "../Slices/userSlice";

//imports for password visibility
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

//Import validation
import { validateUserInputs } from "../utils/validation/validations";

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

  // destructure state of userInputs
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
      const validationErrors = validateUserInputs(userInputs); // sets any errors to object
      setErrorsOfInputs(validationErrors); // sets state of errors if present
      const firstError = Object.values(validationErrors).find(
        // finds first error
        (error: string) => error !== ""
      );

      if (firstError) {
        // sets alert to first error
        alert(`Bad data input: ${firstError}`); // use he snackbar somehow??
        return; // quits onSubmit here if there is any error found
      }

      try {
        const authData = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailInput,
          companyInput,
          phoneInput,
          passwordInput,
          setSignUpError,
        );

        if (authData) {
          dispatch(setUser(authData)); 
          console.log("Sign-up successful");
          navigate("/userHomePage");
        }
      } catch (error) {
        console.error("Error during sign-up:", error);
      }
    } else {
      try {
        // begin login.
        const authData = await handleLogin(emailInput, passwordInput);

        if (authData && authData.uid) {
          // Fetch user data from Firestore or Firebase auth as required
          const fetchedUserData = await fetchUserDocFromFirestore(authData.uid);
          if (fetchedUserData) {
            dispatch(setUser(fetchedUserData as UserType)); 
          }
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
  );
};
