// useFirebaseAuth.ts
import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { User, getAuth, onAuthStateChanged } from 'firebase/auth';
import { setUser } from '../Slices/userSlice';

import { fetchUserDocFromFirestore } from './userData/fetchUserDocFromFirestore';
import { RootState } from './store'; 
import { UserType } from './types';

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();
  // Select the current user from the Redux store
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const [initializing, setInitializing] = useState(true); // Add an initializing state

  const handleUserChange = useCallback(async (user: User | null) => {
    if ((user && user.uid === currentUser?.uid) || (!user && !currentUser)) {
      return;
    }

    // If user is logged in and the UID has changed, fetch user document
    if (user) {
      try {
        const userDataFromFirestore = await fetchUserDocFromFirestore(user.uid, dispatch) as UserType;
        if (userDataFromFirestore) {
          dispatch(setUser(userDataFromFirestore));
        } else {
          // Handle the case where user data does not exist in Firestore
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      // User is logged out
      dispatch(setUser(null));
    }
  }, [dispatch, currentUser]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      handleUserChange(user);
      setInitializing(false); // Set initializing to false once user is determined
    });

    // Clean up the subscription
    return () => {
      unsubscribe();
    };
  }, [handleUserChange]);

  return { currentUser, initializing }; // Return the initializing state
};