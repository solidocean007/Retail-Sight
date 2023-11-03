// userActions.ts
// import { createAsyncThunk } from "@reduxjs/toolkit";
// import { UserType } from "../utils/types";
// import { SerializedError } from "@reduxjs/toolkit";
// import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";

// export const setUser = createAsyncThunk<
//   UserType,
//   { uid: string; },
//   { rejectValue: SerializedError }
// >(
//   'user/setUser',
//   async ({ uid }, { rejectWithValue }) => {
//     // if (!uid) return null;
//     try {
//       const userData = await fetchUserDocFromFirestore(uid) as UserType;
//       if (!userData) {
//         throw new Error('User data not found');
//       }
//       return userData;
//     } catch (error) {
//       const err = error as Error; // Explicitly type-casting the error
//       return rejectWithValue({
//         message: err.message || 'Unknown error occurred'
//       });
      
//     }
//   }
// );

import { createAsyncThunk } from "@reduxjs/toolkit";
import { UserType } from "../utils/types";
import { SerializedError } from "@reduxjs/toolkit";
import { fetchUserDocFromFirestore } from "../utils/userData/fetchUserDocFromFirestore";
import { incrementRead } from "../Slices/firestoreReadsSlice";

export const setUser = createAsyncThunk<
  UserType,
  { uid: string },
  { rejectValue: SerializedError; dispatch: any } // Add dispatch type to the ThunkAPI configuration
>(
  'user/setUser',
  async ({ uid }, { rejectWithValue, dispatch }) => {
    try {
      const userData = await fetchUserDocFromFirestore(uid) as UserType;
      dispatch(incrementRead(1)); // Increment read count after a successful fetch
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
