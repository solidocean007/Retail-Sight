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
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
// import { useStyles } from "../utils/PostLogic/makeStyles";

export const SignUpLogin = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  // New state in SignUpLogIn.tsx
  const [userType, setUserType] = useState<"distributor" | "supplier" | "">("");
  // Directly initialize emailParam and companyNameParam from URL
  const searchParams = new URLSearchParams(location.search);

  const initialEmailParam = (searchParams.get("email") || "")
    .trim()
    .toLowerCase();
  const initialCompanyNameParam = (searchParams.get("companyName") || "")
    .trim()
    .toLowerCase();

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

    setEmailParam(email.trim().toLowerCase());
    setCompanyNameParam(companyName.trim().toLowerCase());

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
    companyTypeInput: "",
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
      companyTypeInput: "",
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
    companyTypeInput,
    phoneInput,
    passwordInput,
  } = userInputs;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);

    if (isSignUp) {
      // 1) Validate
      const validationErrors = validateUserInputs(userInputs);
      if (!userType)
        validationErrors.companyInputError ||=
          "Select distributor or supplier.";
      setErrorsOfInputs(validationErrors);
      const firstError = Object.values(validationErrors).find((e) => e);
      if (firstError) {
        dispatch(showMessage(`Bad data input: ${firstError}`));
        return;
      }

      try {
        // 2) Normalize
        const emailNormalized = emailInput.trim().toLowerCase();
        const companyNormalized = normalizeCompanyInput(companyInput);
        const phoneNormalized = (phoneInput || "").replace(/\D+/g, "");

        // 3) Create Auth user + base pending user doc
        const authUser = await handleSignUp(
          firstNameInput,
          lastNameInput,
          emailNormalized,
          phoneNormalized,
          passwordInput,
          userType, // ✅ new arg
          "status-pending", // ✅ default pending
          setSignUpError
        );

        if (!authUser?.uid) throw new Error("User creation failed");

        // 4) Company resolve/create (seed free + unverified)
        const existing = await findMatchingCompany(companyNormalized);
        let companyId = existing?.id ?? "";
        let companyName = existing?.companyName ?? companyNormalized;

        if (!existing) {
          const created = await createNewCompany(
            companyNormalized,
            authUser.uid,
            {
              verified: false,
              tier: "free",
              limits:
                userType === "supplier"
                  ? { maxUsers: 1, maxConnections: 1 }
                  : { maxUsers: 5, maxConnections: 1 },
            }
          );
          companyId = created?.companyId;
          companyName = created?.companyName || companyNormalized;
        }

        // 5) Invite fulfillment (keeps your behavior)
        if (initialEmailParam.length > 0) {
          try {
            const q = query(
              collection(db, "invites"),
              where("email", "==", initialEmailParam),
              where("status", "==", "pending")
            );
            const snap = await getDocs(q);
            await Promise.all(
              snap.docs.map((d) =>
                updateDoc(doc(db, "invites", d.id), {
                  status: "fulfilled",
                  fulfilledAt: new Date(),
                })
              )
            );
          } catch (updateError) {
            console.log("error updating invite", updateError);
          }
        }

        // 6) Update user with company attachment (still pending/trial)
        await updateUsersCompany(authUser.uid, {
          company: companyName,
          companyId,
          role: "status-pending",
          status: "trial",
          verified: false,
          tier: "free",
          userType, // store on user too for convenience
          emailLower: emailNormalized,
        });

        // 7) Create access request so admins/dev can approve
        //    (Company may be unverified; this gives you a queue.)
        try {
          const { addDoc, collection, serverTimestamp } = await import(
            "firebase/firestore"
          );
          await addDoc(collection(db, "accessRequests"), {
            uid: authUser.uid,
            emailLower: emailNormalized,
            userType,
            companyId: companyId || null,
            companyNameNormalized: companyNormalized,
            status: "pending",
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Failed to create access request", err);
        }

        // 8) Load user into Redux (optional but keeps UX smooth)
        try {
          const freshUser = (await fetchUserDocFromFirestore(
            authUser.uid
          )) as UserType;
          dispatch(setUser(freshUser || null));
        } catch {}

        dispatch(showMessage("Sign-up successful — pending approval."));
        navigate("/trial"); // ✅ NEW: send them to the Trial/Pending dashboard
      } catch (error) {
        console.error(error);
        dispatch(showMessage(`Sign-up error: ${String(error)}`));
      } finally {
        resetForm();
      }
      return;
    }

    // === LOGIN PATH ===
    try {
      const authData = await handleLogin(
        emailInput.trim().toLowerCase(),
        passwordInput
      );
      if (authData?.uid) {
        const fetched = (await fetchUserDocFromFirestore(
          authData.uid
        )) as UserType;
        if (fetched) {
          dispatch(setUser(fetched));
          // 🚦 If still pending/trial, send to trial page
          if (
            fetched.role === "status-pending" ||
            fetched.status === "trial" ||
            !fetched.verified
          ) {
            navigate("/trial");
          } else {
            navigate("/");
          }
        }
      }
      dispatch(showMessage(`Login successful`));
    } catch (error) {
      dispatch(showMessage(`Login error:  ${error}`));
    } finally {
      resetForm();
    }
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

                  {/* Replace the placeholder "company-type" div with this: */}
                  <div style={{ margin: "8px 0 4px" }}>
                    <Typography variant="caption">I am a:</Typography>
                    <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="userType"
                          value="distributor"
                          checked={userType === "distributor"}
                          onChange={() => setUserType("distributor")}
                        />
                        Distributor
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name="userType"
                          value="supplier"
                          checked={userType === "supplier"}
                          onChange={() => setUserType("supplier")}
                        />
                        Supplier
                      </label>
                    </div>
                  </div>

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
