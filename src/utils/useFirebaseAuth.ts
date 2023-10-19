// usefirebaseauth
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { setUser, logoutUser } from '../Slices/userSlice';

export const useFirebaseAuth = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        const plainUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phone: user.phoneNumber,
        };
        dispatch(setUser(plainUser));
      } else {
        dispatch(logoutUser());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
};
