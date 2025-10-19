import { useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { openDB } from "../utils/database/indexedDBOpen";
import { clearPostsData, mergeAndSetPosts, setPosts } from "../Slices/postsSlice";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import store from "../utils/store";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { normalizePost } from "../utils/normalizePost";

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
      try {
        const db = await openDB();
        const tx = db.transaction("localSchemaVersion", "readwrite");
        const store = tx.objectStore("localSchemaVersion");
        await store.put({ id: "schemaVersion", version });
        console.log("✅ Updated local schema version to:", version);
      } catch (err) {
        console.error("❌ Failed to update local schema version:", err);
      }
    };

    const checkAndMigrateData = async () => {
      const firestore = getFirestore();
      const appConfigRef = collection(firestore, "appConfig");

      try {
        // console.log("🚀 Starting schema version check...");
        const appConfigSnapshot = await getDocs(appConfigRef);
        let remoteVersion: string | null = null;

        appConfigSnapshot.forEach((doc) => {
          if (doc.exists()) {
            remoteVersion = doc.data().schemaVersion;
            // console.log(
            //   "🌐 Remote schemaVersion from Firestore:",
            //   remoteVersion,
            // );
          }
        });

        const localVersion = await getLocalSchemaVersion();
        // console.log("💾 Local schemaVersion in IndexedDB:", localVersion);

        if (!remoteVersion) {
          console.warn("⚠️ Remote schemaVersion is undefined or null.");
          return;
        }

        if (!localVersion || localVersion !== remoteVersion) {
          console.warn(
            "🛠️ Version mismatch or missing. Performing migration...",
          );
          await migrateLocalData();

          try {
            console.log("📦 Fetching fresh posts after schema reset...");
            const companyId = user?.companyId;

            if (!companyId) {
              console.warn("⚠️ No companyId found — cannot re-fetch posts.");
            } else {
              const action = await store.dispatch(
                fetchInitialPostsBatch({
                  POSTS_BATCH_SIZE,
                  currentUserCompanyId: companyId,
                }),
              );

              if (fetchInitialPostsBatch.fulfilled.match(action)) {
                const { posts } = action.payload;
                console.log(`✅ Fetched ${posts.length} posts`);
                const normalizedPosts = posts.map(normalizePost);
                store.dispatch(mergeAndSetPosts(normalizedPosts));

                await addPostsToIndexedDB(posts);
                console.log("💾 Posts saved to Redux and IndexedDB");
              } else {
                console.error("❌ Failed to fetch posts after migration.");
              }
            }
          } catch (fetchError) {
            console.error("❌ Unexpected error during post fetch:", fetchError);
          }

          // ✅ Set version regardless of fetch result
          await setLocalSchemaVersion(remoteVersion);
        } else {
          // console.log("✅ Schema version is up-to-date. No migration needed.");
        }
      } catch (error) {
        console.error("❌ Error during schema check/migration:", error);
      }
    };

    checkAndMigrateData();
  }, []);
};

export default useSchemaVersion;
