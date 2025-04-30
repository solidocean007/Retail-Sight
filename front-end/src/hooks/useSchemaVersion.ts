import { useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { openDB } from "../utils/database/indexedDBOpen";
import { clearPostsData, setPosts } from "../Slices/postsSlice";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import store from "../utils/store";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";

// 🔧 Can be bumped manually when needed
const POSTS_BATCH_SIZE = 50;
const useSchemaVersion = () => {
  const user = useSelector(selectUser); // will this be ready so soon always when its called in App.tsx?

  useEffect(() => {
    if (!user?.companyId) return;
    const getLocalSchemaVersion = async (): Promise<string | null> => {
      const db = await openDB();
      const transaction = db.transaction("localSchemaVersion", "readonly");
      const store = transaction.objectStore("localSchemaVersion");
      const request = store.get("schemaVersion");

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result?.version ?? null);
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
        console.log(`🧹 Cleared IndexedDB store: ${name}`);
      }

      store.dispatch(clearPostsData());
      console.log("🧼 Cleared Redux posts data");

      await Promise.all(clearPromises);
    };

    const setLocalSchemaVersion = async (version: string) => {
      const db = await openDB();
      const transaction = db.transaction("localSchemaVersion", "readwrite");
      const store = transaction.objectStore("localSchemaVersion");
      await store.put({ id: "schemaVersion", version });
      console.log("✅ Updated local schema version to:", version);
    };

    const checkAndMigrateData = async () => {
      const firestore = getFirestore();
      const appConfigRef = collection(firestore, "appConfig");

      try {
        const appConfigSnapshot = await getDocs(appConfigRef);
        let remoteVersion: string | null = null;

        appConfigSnapshot.forEach((doc) => {
          if (doc.exists()) {
            remoteVersion = doc.data().schemaVersion;
          }
        });

        const localVersion = await getLocalSchemaVersion();

        console.log("🔍 Local version:", localVersion);
        console.log("🌐 Remote version:", remoteVersion);

        if (!remoteVersion) {
          console.warn("⚠️ Remote schemaVersion is undefined or null.");
          return;
        }

        if (!localVersion || localVersion !== remoteVersion) {
          console.warn(
            "🛠️ Version mismatch or missing. Performing migration..."
          );
          await migrateLocalData();
          await setLocalSchemaVersion(remoteVersion);

          // ✅ Re-fetch posts after schema reset
          // const user = JSON.parse(localStorage.getItem("user") || "{}");
          const companyId = user?.companyId;

          if (companyId) {
            console.log("📦 Fetching fresh posts after schema reset...");

            store
              .dispatch(
                fetchInitialPostsBatch({
                  POSTS_BATCH_SIZE,
                  currentUserCompanyId: companyId,
                })
              )
              .then((action) => {
                if (fetchInitialPostsBatch.fulfilled.match(action)) {
                  const { posts } = action.payload;
                  store.dispatch(setPosts(posts));
                  addPostsToIndexedDB(posts);
                  console.log("✅ Saved fetched posts to Redux and IndexedDB");
                } else {
                  console.error("❌ Failed to fetch posts after migration.");
                }
              });
          } else {
            console.warn("⚠️ No companyId found — cannot re-fetch posts.");
          }
        } else {
          console.log("✅ Schema version is up-to-date. No migration needed.");
        }
      } catch (error) {
        console.error("❌ Error during schema check/migration:", error);
      }
    };

    checkAndMigrateData();
  }, []);
};

export default useSchemaVersion;
