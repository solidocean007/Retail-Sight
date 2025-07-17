// SignUpLogin.tsx
import { useEffect, useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
// import { useStyles } from "../utils/PostLogic/makeStyles";

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();

  // Directly initialize emailParam and companyNameParam from URL
  const searchParams = new URLSearchParams(location.search);

  const initialEmailParam = searchParams.get("email") || "";
  const initialCompanyNameParam = searchParams.get("companyName") || "";

  const [emailParam, setEmailParam] = useState(
    decodeURIComponent(initialEmailParam)
  );
  const [companyNameParam, setCompanyNameParam] = useState(
    decodeURIComponent(initialCompanyNameParam)
  );
  const [isEmailDisabled, setIsEmailDisabled] = useState(!!initialEmailParam);
  const [isCompanyDisabled, setIsCompanyDisabled] = useState(
    !!initialCompanyNameParam
  );

  // useEffect to get parameters from url
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const email = searchParams.get("email") || "";
    const companyName = searchParams.get("companyName") || "";
    const mode = searchParams.get("mode");

    setEmailParam(email);
    setCompanyNameParam(companyName);

    if (email || companyName) {
      setUserInputs((prevState) => ({
        ...prevState,
        emailInput: decodeURIComponent(email),
        companyInput: decodeURIComponent(companyName),
      }));

      setIsEmailDisabled(!!email);
      setIsCompanyDisabled(!!companyName);
    }

    // Default to sign-up mode if 'mode=signup' exists
    if (mode === "signup") {
      setIsSignUp(true);
    }
  }, [location]);

  const [signUpError, setSignUpError] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    passwordConfirm: false,
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [userInputs, setUserInputs] = useState<TUserInputType>({
    firstNameInput: "",
    lastNameInput: "",
    emailInput: emailParam,
    companyInput: companyNameParam,
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

  const checkingIfUserExists = async (email: string) => {
  try {
    const response = await fetch(
      "https://my-fetch-data-api.vercel.app/api/checkUserExists", // ✅ correct spelling
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer <optional-if-you-check-auth>",
        },
        body: JSON.stringify({ email }),
      }
    );

    const result = await response.json();
    console.log(result); // { exists: true, uid: "..." } or { exists: false }

    return result.exists;
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
};


  function formButtonMessage() {
    return isSignUp ? "switch to login" : "No account? Sign-up Now";
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

        if (authData && authData?.uid) {
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

            // If there was an emailParam, the user signed up through an invite link
            if (initialEmailParam.length > 0) {
              // Update the invite status to "fulfilled"
              console.log("initialEmailParam: ", initialEmailParam);
              const inviteRef = doc(db, "invites", initialEmailParam);
              try {
                await updateDoc(inviteRef, {
                  status: "fulfilled",
                  fulfilledAt: new Date(),
                });
              } catch (updateError) {
                console.log("error updating invite", updateError);
              }
            }
          } else {
            companyData = await createNewCompany(
              normalizedCompanyInput,
              authData.uid
            );
          }

          // Now update the user's Firestore document with the company information
          const updateData = {
            company: companyData?.companyName,
            companyId: companyData?.companyId,
          };
          await updateUsersCompany(authData.uid, updateData); // Function to update Firestore user document

          // Fetch user data from Firestore
          const fetchedUserData = (await fetchUserDocFromFirestore(
            authData.uid
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
            authData.uid
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

  const handleResetPassword = async () => {
    if (!userInputs.emailInput) {
      dispatch(showMessage("Please enter your email."));
      return;
    }

    const normalizedEmail = userInputs.emailInput.trim().toLowerCase();

    try {
      const exists = await checkingIfUserExists(normalizedEmail);
      if (!exists) {
        dispatch(
          showMessage(
            "This email is not registered. Please check for typos or sign up."
          )
        );
        return;
      }

      await sendPasswordResetEmail(getAuth(), normalizedEmail);
      dispatch(showMessage("Password reset email sent! Check your inbox."));
    } catch (error: any) {
      if (error.code === "auth/invalid-email") {
        dispatch(showMessage("Please enter a valid email address."));
      } else {
        dispatch(
          showMessage("Unable to send reset email. Please try again later.")
        );
      }
      console.error("Password Reset Error:", error);
    }
  };

  return (
    <>
      <SignUpLoginHelmet />
      <div className="sign-up-body">
        <h1 className="title">Displaygram</h1>
        <div className="sign-up-container">
          <div className="form-heading">
            <p>{isSignUp ? "Sign Up!" : "Log In"}</p>
          </div>
          <button onClick={setFormMode}>{formButtonMessage()}</button>
          <form noValidate onSubmit={onSubmit}>
            <div className="sign-up-login-form">
              {isSignUp ? (
                <div className="form-container">
                  {/* Sign Up Fields */}
                  {/* First Name */}
                  <TextField
                    style={{ marginBottom: "5px" }}
                    size="small"
                    label="First Name"
                    name="firstNameInput"
                    value={userInputs.firstNameInput}
                    onChange={(e) =>
                      handleInputChange("firstNameInput", e.target.value)
                    }
                    sx={{
                      input: {
                        fontSize: "16px",
                        padding: "12px",
                        overflowX: "auto",
                        whiteSpace: "nowrap",
                      },
                      height: "56px", // apply to container
                      width: "100%", // full width in parent
                    }}
                  />
                  <ErrorMessage
                    message={errorsOfInputs.firstNameInputError}
                    show={
                      triedSubmit &&
                      errorsOfInputs.firstNameInputError.length > 0
                    }
                  />

                  <TextField
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
                    label="Phone Number"
                    name="phoneInput"
                    value={userInputs.phoneInput}
                    onChange={(e) =>
                      handleInputChange("phoneInput", e.target.value)
                    }
                    autoComplete="tel"
                  />
                  <ErrorMessage
                    message={errorsOfInputs.phoneInputError}
                    show={
                      triedSubmit && errorsOfInputs.phoneInputError.length > 0
                    }
                  />

                  <TextField
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                  <button type="submit">Submit</button>
                </div>
              ) : (
                <div className="form-container">
                  {/* Log In Fields */}
                  {/* Email */}
                  <TextField
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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
                    className="signup-textfield"
                    style={{ marginBottom: "5px" }}
                    size="small"
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

                  <button type="submit">Submit</button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={!userInputs.emailInput.trim()}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
              {signUpError && <div className="error">{signUpError}</div>}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
