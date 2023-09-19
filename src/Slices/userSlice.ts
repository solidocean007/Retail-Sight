// userSlice.js
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  handleSignUp as signUpService,
  handleLogin as loginService,
} from "../utils/authenticate";
import { UserType , TUserInputType } from "../utils/types";

type UserState = {
  user?: UserType | null;
  error?: string;
}

const initialState: UserState = {
  user: undefined,
  error: undefined
};


// Define handleSignUp thunk
export const handleSignUp = createAsyncThunk(
  "user/signUp",
  async (userDetails: TUserInputType, thunkAPI: any) => {
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
        setSignUpError,
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
  async (credentials: TypeUserCredentials, thunkAPI: any) => {
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
    setUser: (state, action: PayloadAction<UserType | null>) => {
      state.user = action.payload;
    },
    logoutUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
    .addCase(handleSignUp.fulfilled, (state, action: PayloadAction<UserType>) => {
      state.user = action.payload;
      state.error = undefined;
    })
    .addCase(handleSignUp.rejected, (state, action) => {
      state.error = action.error.message || 'An error occured'; 
    })
    .addCase(handleLogin.fulfilled, (state, action: PayloadAction<{ user: UserType }>) => {
      state.user = action.payload.user;
      state.error = undefined;
    })
    .addCase(handleLogin.rejected, (state, action ) => {
      state.error = action.error.message; 
    });
  },
});

export const { setUser, logoutUser } = userSlice.actions;
export const selectUser = (state: { user: UserState }) => state.user; 
export default userSlice.reducer;

