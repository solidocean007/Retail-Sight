//Authenticate.ts
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
import { setDoc, getDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { UserType } from "../types";

interface FirebaseError extends Error {
  code: string;
}

type RoleType = "admin" | "super-admin" | "employee" | "status-pending";
type UserTypeChoice = "distributor" | "supplier" | "";

export const deprecatedHandleSignUp = async (
  firstNameInput: string,
  lastNameInput: string,
  emailRaw: string,
  phoneInput: string,
  passwordInput: string,
  userType: UserTypeChoice, // ✅ NEW required
  role: RoleType = "status-pending", // ✅ default to pending
  setSignUpError?: (error: string) => void
): Promise<UserType | undefined> => {
  try {
    const email = emailRaw.trim().toLowerCase();
    const first = firstNameInput.trim().toLowerCase();
    const last = lastNameInput.trim().toLowerCase();
    // Create user with email and password in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      passwordInput
    );
    sendEmailVerification(userCredential.user)
      .then(() => {
        console.log("Verification email sent.");
      })
      .catch((error) => {
        console.error("Error sending verification email:", error);
      });

    if (!userCredential.user) return;

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
        firstName: first,
        lastName: last,
        email: email,
        phone: phoneInput || "",
        role,
        status: "trial", // Type '"trial"' is not assignable to type '"active" | "inactive" | undefined'.ts
        verified: false,
        company: "",
        companyId: "",
      };

      await setDoc(doc(collection(db, "users"), uid), {
        userData,
      });
      return userData;
    }
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;

    console.error(
      "Error encountered during sign-up process:",
      errorCode,
      errorMessage
    );

    if (setSignUpError) {
      // Check if setSignUpError is defined
      if (errorCode === "auth/email-already-in-use") {
        setSignUpError(
          "The email address is already in use by another account."
        );
      } else {
        setSignUpError(
          errorMessage || "An error occurred during the sign-up process."
        );
      }
    }

    throw error;
  }
};

export const deprecatedHandleLogin = async (
  email: string,
  password: string
): Promise<UserType | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    if (user) {
      const uid = user.uid;
      // Fetch additional user data from Firestore
      const docRef = doc(collection(db, "users"), uid);
      // console.log("get user from login read");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserType;
        return {
          ...data,
        };
      } else {
        console.log("No such user!");
        return null;
      }
    }

    return null;
  } catch (error) {
    const firebaseError = error as FirebaseError;
    const errorCode = firebaseError.code;
    const errorMessage = firebaseError.message;
    console.error("Error logging in: ", errorCode, errorMessage);
    throw error;
  }
};

export const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};
