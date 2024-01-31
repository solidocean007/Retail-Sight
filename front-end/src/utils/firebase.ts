// firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, updateProfile } from "firebase/auth";
import { getFirestore} from "firebase/firestore";
import { getStorage } from "firebase/storage";


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

// Initialize Firebase Storage
const storage = getStorage(app); // Add this line

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

export { auth, db, updateProfile, storage };