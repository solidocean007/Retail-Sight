// useSchemaVersion.js

import { useEffect } from "react";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { openDB } from "../utils/database/indexedDBOpen";
import { useDispatch } from "react-redux";
import { clearPostsData } from "../Slices/postsSlice";

const useSchemaVersion = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const getLocalSchemaVersion = async () => {
      const db = await openDB();
      const transaction = db.transaction("localSchemaVersion", "readonly");
      const store = transaction.objectStore("localSchemaVersion");
      const request = store.get("schemaVersion");

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result?.version);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    };

    const migrateLocalData = async () => {
      const db = await openDB();
      const objectStoreNames = db.objectStoreNames;
      const clearPromises = [];

      for (const name of objectStoreNames) {
        const transaction = db.transaction(name, "readwrite");
        const store = transaction.objectStore(name);
        clearPromises.push(store.clear());
      }

      dispatch(clearPostsData());

      await Promise.all(clearPromises);
    };

    const setLocalSchemaVersion = async (version: string | null) => {
      // Only proceed if version is a string
      if (version) {
        const db = await openDB();
        const transaction = db.transaction("localSchemaVersion", "readwrite");
        const store = transaction.objectStore("localSchemaVersion");
        await store.put({ id: "schemaVersion", version: version });
      } else {
        console.error(
          "Attempted to set local schema version with null or undefined."
        );
      }
    };

    const checkAndMigrateData = async () => {
      const firestore = getFirestore(); // Initialize Firestore
      const appConfigCollectionRef = collection(firestore, "appConfig");
      try {
        const appConfigSnapshot = await getDocs(appConfigCollectionRef);
        let remoteVersion;
        appConfigSnapshot.forEach((doc) => {
          // Assuming there's only one document in this collection
          if (doc.exists()) {
            remoteVersion = doc.data().schemaVersion;
          }
        });
        const localVersion = await getLocalSchemaVersion();

        if (remoteVersion == null) {
          console.error(
            "Failed to fetch remote schema version. It is null or undefined."
          );
        } else if (!localVersion || localVersion !== remoteVersion) {
          console.log(
            "Local version is outdated or missing. Starting migration..."
          );
          await migrateLocalData();
          await setLocalSchemaVersion(remoteVersion);
        } else {
        }
      } catch (error) {
        console.error("Error fetching remote schema version:", error);
      }
    };

    checkAndMigrateData();
  }, [dispatch]);
};

export default useSchemaVersion;
