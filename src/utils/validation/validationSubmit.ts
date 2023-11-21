// validationSubmit.ts
import { handleSignUp, handleLogin } from "./authenticate";
import { fetchUserDocFromFirestore } from "../userData/fetchUserDocFromFirestore";
import { setUser } from "../../actions/userActions";
import { saveUserDataToIndexedDB } from "../database/userDataIndexedDB";
import { validateUserInputs } from "./validations";
import { showMessage } from "../../Slices/snackbarSlice";
import { AppDispatch } from "../store";
import { TUserInputType, TErrorsOfInputs } from "../types";
import { UserType } from "../types";
// import { incrementRead } from "../Slices/firestoreReadsSlice";


// You should pass these as arguments instead of using them directly
export const handleLoginSubmit = async (
  userInputs: TUserInputType,
  dispatch: AppDispatch,
  navigate: (path: string) => void
) => {
  const { emailInput, passwordInput } = userInputs;
  try {
    const authData = await handleLogin(emailInput, passwordInput);
    if (authData && authData.uid) {
      const fetchedUserData = await fetchUserDocFromFirestore(authData.uid);
      if (fetchedUserData) {
        const userData: UserType = fetchedUserData as UserType;
        dispatch(setUser({ uid: userData.uid }));
        await saveUserDataToIndexedDB(userData);
      }
      dispatch(showMessage(`Login successful`));
      navigate("/userHomePage");
    }
  } catch (error) {
    dispatch(showMessage(`Login error:  ${error}`));
  }
};

export const handleSignUpSubmit = async (
  userInputs: TUserInputType,
  setErrorsOfInputs: (errors: TErrorsOfInputs) => void,
  setSignUpError: (error: string) => void,
  dispatch: AppDispatch,
  navigate: (path: string) => void
) => {
  const validationErrors = validateUserInputs(userInputs);
  setErrorsOfInputs(validationErrors);
  const firstError = Object.values(validationErrors).find(error => error !== "");

  if (firstError) {
    dispatch(showMessage(`Bad data input: ${firstError}`));
    return;
  }

  try {
    const authData = await handleSignUp(
      userInputs.firstNameInput,
      userInputs.lastNameInput,
      userInputs.emailInput,
      userInputs.companyInput,
      userInputs.phoneInput,
      userInputs.passwordInput,
      setSignUpError
    );

    if (authData?.uid) {
      dispatch(setUser({ uid: authData.uid }));
      // Transform userInputs to UserType
      const userData: UserType = {
        uid: authData.uid,
        firstName: userInputs.firstNameInput,
        lastName: userInputs.lastNameInput,
        email: userInputs.emailInput,
        company: userInputs.companyInput,
        phone: userInputs.phoneInput,
        // Add any other fields that UserType might require
      };
      await saveUserDataToIndexedDB(userData);
      dispatch(showMessage(`Sign-up successful`));
      navigate("/userHomePage");
    }
  } catch (error) {
    dispatch(showMessage(`Sign-up error: ${error}`));
  }
};

