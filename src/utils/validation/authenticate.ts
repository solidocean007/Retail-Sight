//Authenticate.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
// import { TPhoneInputState } from "./types";
import { setDoc, getDoc,doc, collection } from "firebase/firestore";
import { UserType } from "../types";
import { firestoreRead } from "../firestoreUtils";

interface FirebaseError extends Error {
  code: string;
}

export const handleSignUp = async (
  firstNameInput: string,
  lastNameInput: string,
  email: string,
  companyInput: string,
  phoneInput: string,
  passwordInput: string,
  setSignUpError?: (error: string) => void
): Promise<UserType | undefined> => { 
  try {
    console.log("Starting user creation with Firebase Auth...");

    // Create user with email and password in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, passwordInput);
    console.log("User creation with Firebase Auth successful, userCredential:", userCredential);

    // Check if user is created successfully
    if (userCredential.user) {
      const uid = userCredential.user.uid;

      // Set the displayName for the user
      const displayName = `${firstNameInput} ${lastNameInput}`;
      await updateProfile(userCredential.user, { displayName });
      console.log("User displayName set successfully in Firebase Auth");

      console.log("Adding user data to Firestore...");
      // Add the additional user data to Firestore
      const userData: UserType = {
        uid: userCredential.user.uid,
        firstName: firstNameInput,
        lastName: lastNameInput,
        email: email,
        company: companyInput,
        phone: phoneInput,
      };

      await setDoc(doc(collection(db, "users"), uid), {
        // uid: uid,
        ...userData
      });
      
      console.log("User data added to Firestore successfully");
      return userData;
    }
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;

    console.error("Error encountered during sign-up process:", errorCode, errorMessage);

    if (setSignUpError) { // Check if setSignUpError is defined
      if (errorCode === "auth/email-already-in-use") {
        setSignUpError("The email address is already in use by another account.");
      } else {
        setSignUpError(errorMessage || "An error occurred during the sign-up process.");
      }
    }


    throw error;
  }
};

export const handleLogin = async (email: string, password: string): Promise<UserType | null> => {
  console.log("Attempting to log in with:", email, password); // Logging credentials (be cautious with logging sensitive data like passwords in production)
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("UserCredential obtained:", userCredential);

    if (user) {
      const uid = user.uid;
      console.log("User UID:", uid);

      // Fetch additional user data from Firestore
      const docRef = doc(collection(db, "users"), uid);
      console.log("Document reference for Firestore:", docRef);

      const data = await firestoreRead(async () => {
        const docSnap = await getDoc(doc(collection(db, "users"), uid));
        if (docSnap.exists()) {
          return docSnap.data() as UserType;
        }
        return null;
      }, `Fetching user data for UID: ${uid}`);

      if (data) {
        console.log("User data from Firestore:", data);
        return data;
      } else {
        console.log("No such user in Firestore!");
        return null;
      }
    } else {
      console.log("No user found in Firebase Auth");
      return null;
    }
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;
    console.error("Error logging in: ", errorCode, errorMessage);
    throw error; // Rethrowing the error to be handled or logged elsewhere
  }
};

export const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};