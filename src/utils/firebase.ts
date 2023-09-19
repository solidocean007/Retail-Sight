// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, updateProfile, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import store from "./store";
// import { setUser, logoutUser } from "../Slices/userSlice";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  storageBucket: "retail-sight.appspot.com",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
  measurementId: "G-XSXPNG7BCB"
};

// Initialize Firebase with the config
const app = initializeApp(firebaseConfig);
console.log("Firebase initialized.");

// Get a reference to the auth service
const auth = getAuth(app);

// Get a reference to the Firestore service
const db = getFirestore(app); 

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting persistence", error);
  });

  // onAuthStateChanged(auth, (user) => {
  //   if (user) {
  //     // User is signed in, you can dispatch a Redux action here
  //     store.dispatch(setUser(user)); // Type 'User' is missing the following properties from type 'UserType': id, name, company, userId
  //   } else {
  //     // No user is signed in, you can set user to null in Redux store
  //     store.dispatch(logoutUser());
  //   }
  // });

export { auth, db, updateProfile };