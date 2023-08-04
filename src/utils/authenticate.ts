import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

interface FirebaseError extends Error {
  code: string;
}

export const handleSignUp = async (email: string, password: string, setSignUpError: (error: string) => void) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;
    console.error('Error signing up: ', errorCode, errorMessage);
    
    // Check if error code is 'auth/email-already-in-use'
    if (errorCode === 'auth/email-already-in-use') {
      setSignUpError('The email address is already in use by another account.');
    }

    throw error;
  }
}


export const handleLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    return user;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;
    console.error("Error logging in: ", errorCode, errorMessage);
    throw error;
  }
};
