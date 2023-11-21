// userActions.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { UserType } from "../utils/types";
import { SerializedError } from "@reduxjs/toolkit";
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";
import { AppDispatch } from "../utils/store";
import { firestoreRead } from "../utils/firestoreUtils";

export const setUser = createAsyncThunk<
  UserType,
  { uid: string },
  { rejectValue: SerializedError; dispatch: AppDispatch }
>(
  'user/setUser',
  async ({ uid }, { rejectWithValue }) => {
    try {
      const userData = await firestoreRead(() => fetchUserDocFromFirestore(uid)) as UserType;
      if (!userData) {
        throw new Error('User data not found');
      }
      return userData;
    } catch (error) {
      const err = error as Error;
      return rejectWithValue({
        message: err.message || 'Unknown error occurred'
      });
    }
  }
);

