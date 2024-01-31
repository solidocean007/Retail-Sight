// SignUpLogin.tsx
import { useEffect, useState } from "react";
import { TErrorsOfInputs, TUserInputType, UserType } from "../utils/types";
import { ErrorMessage } from "./ErrorMessage";
import { handleSignUp, handleLogin } from "../utils/validation/authenticate";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";

// Import necessary Material-UI components
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
// import { makeStyles } from "@mui/material";
// import items from Redux
import { useAppDispatch } from "../utils/store";
// import { incrementRead } from "../Slices/firestoreReadsSlice";
import { setUser } from "../Slices/userSlice";
//imports for password visibility
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

//Import validation
import { validateUserInputs } from "../utils/validation/validations";
import "./signUpLogIn.css";

// Import Snackbar related actions
import { showMessage } from "../Slices/snackbarSlice"; // hideMessage is defined but never used.  What is it for?
import {
  createNewCompany,
  findMatchingCompany,
  normalizeCompanyInput,
} from "../utils/companyLogic";
import { updateSelectedUser as updateUsersCompany } from "../DeveloperAdminFunctions/developerAdminFunctions";
import { SignUpLoginHelmet } from "../utils/helmetConfigurations";
// import { useStyles } from "../utils/PostLogic/makeStyles";

export const SignUpLogin = () => {
  const [emailParam, setEmailParam] = useState('');
  const [companyNameParam, setCompanyNameParam] = useState('');
  
  const [isEmailDisabled, setIsEmailDisabled] = useState(false);
  const [isCompanyDisabled, setIsCompanyDisabled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const email = searchParams.get('email') || '';
    const companyName = searchParams.get('companyName') || '';

    console.log("URL Email:", email);
    console.log("URL Company Name:", companyName);

    setEmailParam(email);
    setCompanyNameParam(companyName);

    if (email || companyName) {
      setUserInputs(prevState => ({
        ...prevState,
        emailInput: decodeURIComponent(email),
        companyInput: decodeURIComponent(companyName),
      }));

      setIsEmailDisabled(!!email);
      setIsCompanyDisabled(!!companyName);
    }
  }, [location]);
  

  const navigate = useNavigate();
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
    emailInput: decodeURIComponent(emailParam),
  companyInput: decodeURIComponent(companyNameParam),
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
      const validationErrors = validateUserInputs(userInputs);
      setErrorsOfInputs(validationErrors);
      const firstError = Object.values(validationErrors).find(
        (error) => error !== ""
      );

      if (firstError) {
        dispatch(showMessage(`Bad data input: ${firstError}`));
        return; // Stop the process if there's a validation error
      }
      try {
        // Proceed with user sign-up with the determined company data
        const authData = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailInput,
          "", // Company name will be set later
          phoneInput,
          passwordInput,
          setSignUpError
        );

        if (authData?.uid) {
          // Assuming validation passed, proceed with company check
          const normalizedCompanyInput = normalizeCompanyInput(companyInput);
          let companyData;

          const matchingCompany = await findMatchingCompany(
            normalizedCompanyInput
          );
          if (matchingCompany) {
            companyData = {
              companyName: matchingCompany.companyName,
              companyId: matchingCompany.id,
            };
          } else {
            companyData = await createNewCompany(
              normalizedCompanyInput,
              authData.uid
            );
          }

          // Now update the user's Firestore document with the company information
          const updateData = {
            company: companyData?.companyName,
            companyId: companyData?.companyId, //  Property 'companyId' does not exist on type '{ lastUpdated: string; companyName: string; altCompanyNames: string[]; adminsUsers: string[]; employeeUsers: never[]; statusPendingUsers: never[]; companyVerified: boolean; createdAt: string; id: string; }'
            // any other user fields you want to update
          };
          await updateUsersCompany(authData.uid, updateData); // Function to update Firestore user document

          // Fetch user data from Firestore
          const fetchedUserData = (await fetchUserDocFromFirestore(
            authData.uid,
            dispatch
          )) as UserType;
          if (fetchedUserData) {
            // Assuming fetchedUserData is of UserType or you can map it to UserType
            dispatch(setUser(fetchedUserData)); // dispatch the full user object
            dispatch(showMessage(`Sign-up successful`));
            navigate("/user-home-page");
          } else {
            // Handle the case where user data does not exist in Firestore
            dispatch(setUser(null));
          }
        }
      } catch (error) {
        dispatch(showMessage(`Sign-up error: ${error}`));
      }
    } else {
      try {
        // begin login.
        const authData = await handleLogin(emailInput, passwordInput);

        if (authData && authData.uid) {
          // Fetch user data from Firestore or Firebase auth as required
          const fetchedUserData = (await fetchUserDocFromFirestore(
            authData.uid,
            dispatch
          )) as UserType;
          if (fetchedUserData) {
            dispatch(setUser(fetchedUserData));
          }
        }

        dispatch(showMessage(`Login successful`));
        navigate("/");
      } catch (error) {
        dispatch(showMessage(`Login error:  ${error}`));
      }
    }
    console.log("Resetting form");
    resetForm();
  };

  return (
    <>
      <SignUpLoginHelmet />
      <div className="sign-up-body">
        <h1 className="title">Displaygram</h1>
        <div className="sign-up-container">
          <Typography variant="h2">
            {isSignUp ? "Sign Up" : "Log In"}
          </Typography>
          <button onClick={setFormMode}>{formButtonMessage()}</button>
          <form noValidate onSubmit={onSubmit}>
            <div className="sign-up-login-form">
              {isSignUp ? (
                <div className="form-container">
                  {/* Sign Up Fields */}
                  {/* First Name */}
                  <TextField
                    style={{ marginBottom: '5px' }}
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
                      triedSubmit &&
                      errorsOfInputs.firstNameInputError.length > 0
                    }
                  />

                  <TextField
                    style={{ marginBottom: '5px' }}
                    label="Last Name"
                    name="lastNameInput"
                    value={userInputs.lastNameInput}
                    onChange={(e) =>
                      handleInputChange("lastNameInput", e.target.value)
                    }
                    // style={textFieldStyle}
                  />
                  <ErrorMessage
                    message={errorsOfInputs.lastNameInputError}
                    show={
                      triedSubmit &&
                      errorsOfInputs.lastNameInputError.length > 0
                    }
                  />

                  <TextField
                  style={{ marginBottom: '5px' }}
                    label="Email"
                    name="emailInput"
                    value={userInputs.emailInput}
                    onChange={(e) =>
                      handleInputChange("emailInput", e.target.value)
                    }
                    disabled={!!isEmailDisabled}
                  />
                  <ErrorMessage
                    message={errorsOfInputs.emailInputError}
                    show={
                      triedSubmit && errorsOfInputs.emailInputError.length > 0
                    }
                  />

                  <TextField
                  style={{ marginBottom: '5px' }}
                    label="Company"
                    name="companyInput"
                    value={userInputs.companyInput}
                    onChange={(e) =>
                      handleInputChange("companyInput", e.target.value)
                    }
                    disabled={!!isCompanyDisabled}
                  />
                  <ErrorMessage
                    message={errorsOfInputs.companyInputError}
                    show={
                      triedSubmit && errorsOfInputs.companyInputError.length > 0
                    }
                  />

                  <TextField
                  style={{ marginBottom: '5px' }}
                    label="Phone Number"
                    name="phoneInput"
                    value={userInputs.phoneInput}
                    onChange={(e) =>
                      handleInputChange("phoneInput", e.target.value)
                    }
                    // style={textFieldStyle}
                  />
                  <ErrorMessage
                    message={errorsOfInputs.phoneInputError}
                    show={
                      triedSubmit && errorsOfInputs.phoneInputError.length > 0
                    }
                  />

                  <TextField
                  style={{ marginBottom: '5px' }}
                    label="Password"
                    name="passwordInput"
                    value={userInputs.passwordInput}
                    type={passwordVisibility.password ? "text" : "password"}
                    onChange={(e) =>
                      handleInputChange("passwordInput", e.target.value)
                    }
                    // style={textFieldStyle}
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
                      triedSubmit &&
                      errorsOfInputs.passwordInputError.length > 0
                    }
                  />

                  {/* Verify Password */}
                  <TextField
                  style={{ marginBottom: '5px' }}
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
                </div>
              ) : (
                <div className="form-container">
                  {/* Log In Fields */}
                  {/* Email */}
                  <TextField
                    style={{ marginBottom: '5px' }}
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

                  {/* Password */}
                  <TextField
                  style={{ marginBottom: '5px' }}
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
                      triedSubmit &&
                      errorsOfInputs.passwordInputError.length > 0
                    }
                  />
                </div>
              )}
              {signUpError && <div className="error">{signUpError}</div>}
              <button type="submit">Submit</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
