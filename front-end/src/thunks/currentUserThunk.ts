// src/thunks/currentUserThunks.ts
import { doc, getDoc } from "firebase/firestore";
import { AppDispatch } from "../utils/store";
import { db } from "../utils/firebase";
import { setUser, setLoading, setError } from "../Slices/userSlice";
import { UserType } from "../utils/types";

export const refreshCurrentUserProfile =
  (uid: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading("pending"));

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        dispatch(setUser(null));
        dispatch(setError("User profile not found."));
        dispatch(setLoading("failed"));
        return null;
      }

      const userData = {
        uid,
        ...snap.data(),
      } as UserType;

      dispatch(setUser(userData));
      dispatch(setLoading("succeeded"));
      return userData;
    } catch (error: any) {
      console.error("Failed to refresh current user profile:", error);
      dispatch(setError(error.message || "Failed to refresh user profile."));
      dispatch(setLoading("failed"));
      return null;
    }
  };