// useFirebaseAuth.ts
import { useEffect, useCallback } from 'react';
import { AppDispatch } from './store';
import { useDispatch } from 'react-redux';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { setUser } from '../actions/userActions';
import { fetchUserDocFromFirestore } from './userData/fetchUserDocFromFirestore';

export const useFirebaseAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  const handleUserChange = useCallback(async (user: User | null) => {
    if (user) {
      try {
        console.log('handleUserChange in useFirebaseAuth read')
        const userDataFromFirestore = await fetchUserDocFromFirestore(user.uid);
        if (userDataFromFirestore) {
          dispatch(setUser({ uid: user.uid }));
        } else {
          dispatch(setUser({ uid: '' }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      dispatch(setUser({ uid: '' }));
    }
  }, [dispatch]);

  useEffect(() => {
    console.log('useFirebaseAuth.ts runs from App.tsx:')
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, handleUserChange);

    return () => {
      unsubscribe();
      console.log('useFirebaseAuth function unmounted');
    }
  }, [handleUserChange]); 
};