// userSlice.js
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  handleSignUp as signUpService,
  handleLogin as loginService,
} from "../utils/validation/authenticate";
import { UserType, TUserInputType } from "../utils/types";
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";
import { ThunkAPI } from "@reduxjs/toolkit";

type UserState = {
  currentUser: UserType | null;
  otherUsers: { [uid: string]: UserType }; // <--- added this line
  error?: string;
};

const initialState: UserState = {
  currentUser: null,
  otherUsers: {}, // <--- added this line
  error: undefined,
};

// Define handleSignUp thunk
export const handleSignUp = createAsyncThunk<
  UserType, // Return type of the thunk, you can adjust based on your actual return type
  TUserInputType, // Arguments type
  {
    rejectValue: any; // Type of the value in case of a rejection
  }
>(
  "user/signUp",
  async (
    userDetails: TUserInputType,
    thunkAPI: ThunkAPI<void, UserState, undefined, any>
  ) => {
    const {
      firstNameInput,
      lastNameInput,
      emailInput,
      companyInput,
      phoneInput,
      passwordInput,
      setSignUpError,
    } = userDetails;
    try {
      const result = await signUpService(
        firstNameInput,
        lastNameInput,
        emailInput,
        companyInput,
        phoneInput,
        passwordInput,
        setSignUpError
      );
      return result;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

// Define fetchIndividualUser thunk
export const fetchIndividualUser = createAsyncThunk(
  "user/fetchIndividualUser",
  async (uid: string) => {
    const userData = await fetchUserDocFromFirestore(uid);
    if (userData === null) {
      throw new Error('User data not found');
    }
    return { uid, userData };
  }
);

interface TypeUserCredentials {
  emailInput: string;
  passwordInput: string;
}

// Define handleLogin thunk
export const handleLogin = createAsyncThunk<
  { user: UserType }, // Return type of the thunk
  TypeUserCredentials, // Arguments type
  {
    rejectValue: any; // Type of the value in case of a rejection
  }
>(
  "user/login",
  async (credentials: TypeUserCredentials, thunkAPI: ThunkAPI<void, UserState, undefined, any>) => {
    const { emailInput, passwordInput } = credentials;
    try {
      const user = await loginService(emailInput, passwordInput);
      if (user && user.uid) {
        const userData = await getUserDataFromFirestore(user.uid);
        return { user: { ...user, ...userData } };
      }
      throw new Error("User not found");
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserType | null>) => {
      state.currentUser = action.payload;
    },
    logoutUser: (state) => {
      state.currentUser = null;
      localStorage.removeItem("userData");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        handleSignUp.fulfilled,
        (state, action: PayloadAction<UserType>) => {
          state.currentUser = action.payload;
          state.error = undefined;
          localStorage.setItem("userData", JSON.stringify(action.payload));
        }
      )
      .addCase(handleSignUp.rejected, (state, action) => {
        state.error = action.error.message || "An error occured";
      })
      .addCase(
        handleLogin.fulfilled,
        (state, action: PayloadAction<{ user: UserType }>) => {
          state.currentUser = action.payload.user;
          state.error = undefined;
          localStorage.setItem("userData", JSON.stringify(action.payload.user));
        }
      )
      .addCase(handleLogin.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(
        fetchIndividualUser.fulfilled,
        (state, action: PayloadAction<{ uid: string, userData: DocumentData }>) => {  // <-- Adjusted the type here
          state.otherUsers[action.payload.uid] = action.payload.userData as UserType; // <-- Typecast here
        }
      )
      
  },
});


export const { setUser, logoutUser } = userSlice.actions;
export const selectUser = (state: { user: UserState }) => state.user;
export const selectOtherUser = (state: { user: UserState }, uid: string) => state.user.otherUsers[uid]; // <--- added this line
export default userSlice.reducer;
