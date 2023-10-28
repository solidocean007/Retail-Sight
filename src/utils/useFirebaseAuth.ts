import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { setUser, logoutUser } from '../Slices/userSlice';
import { fetchUserDocFromFirestore } from './userData/fetchUserDocFromFirestore';
import { UserType } from './types';

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const userDataFromFirestore = await fetchUserDocFromFirestore(user.uid);
        if (userDataFromFirestore) {
          dispatch(setUser(userDataFromFirestore as UserType));
        }
      } else {
        dispatch(logoutUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
};

