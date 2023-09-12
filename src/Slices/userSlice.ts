// userSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  handleSignUp as signUpService,
  handleLogin as loginService,
} from "../utils/authenticate";

import { TUserInputType } from "../utils/types";

type UserState = {
  user?: UserType;
  error?: string;
}

const initialState: UserState = {
  user: undefined,
  error: undefined
};


// Define handleSignUp thunk
export const handleSignUp = createAsyncThunk(
  "user/signUp",
  async (userDetails: TUserInputType, thunkAPI) => {
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
        setSignUpError, // Type 'undefined' is not assignable to type '(error: string) => void'.
      );
      return result;
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

interface TypeUserCredentials {
  emailInput: string;
  passwordInput: string;
}

// Define handleLogin thunk
export const handleLogin = createAsyncThunk(
  "user/login",
  async (credentials: TypeUserCredentials, thunkAPI) => {
    const { emailInput, passwordInput } = credentials;
    try {
      const user = await loginService(emailInput, passwordInput);
      return { user };
    } catch (error) {
      return thunkAPI.rejectWithValue(error);
    }
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => action.payload,
    logoutUser: () => null, // Type 'null' is not assignable to type 'void | UserState | WritableDraft<UserState>'.
  },
  extraReducers: (builder) => {
    builder
      .addCase(handleSignUp.fulfilled, (state, action) => {
        return action.payload;
      })
      .addCase(handleSignUp.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(handleLogin.fulfilled, (state, action) => {
        return action.payload;
      })
      .addCase(handleLogin.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { setUser, logoutUser } = userSlice.actions;
export const selectUser = (state) => state.user; // implicitly has any type
export default userSlice.reducer;

