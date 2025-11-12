// hooks/useSchemaVersion.ts
import { useEffect } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { openDB } from "../utils/database/indexedDBOpen";
import { useAppDispatch } from "../utils/store";
import { setVersions } from "../Slices/appSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { resetApp, safeReload } from "../utils/resetApp";

/**
 * useSchemaVersion
 * Handles:
 *  - Reading remote schemaVersion from Firestore
 *  - Syncing local version in localStorage + IndexedDB
 *  - Triggering reset on mismatch
 *  - Watching for realtime changes
 */
export const useSchemaVersion = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const configRef = doc(db, "appConfig", "HlAAI92RInjZymlMiwqu");

    const syncVersion = async () => {
      try {
        // 1️⃣ Fetch server schema version
        const snap = await getDoc(configRef);
        const serverVersion = snap.exists()
          ? (snap.data().schemaVersion as string)
          : null;

        if (!serverVersion) return;

        // 2️⃣ Read local version
        let localVersion = localStorage.getItem("app_version");

        // 3️⃣ Initialize local if missing
        if (!localVersion) {
          localVersion = serverVersion;
          localStorage.setItem("app_version", serverVersion);

          const dbConn = await openDB();
          const tx = dbConn.transaction("localSchemaVersion", "readwrite");
          tx.objectStore("localSchemaVersion").put({
            id: "schemaVersion",
            version: serverVersion,
          });
        }

        dispatch(setVersions({ localVersion, serverVersion }));

        // 4️⃣ If mismatch, reset
        if (serverVersion !== localVersion) {
          console.log("🔄 Schema mismatch detected — resetting app.");
          await resetApp(dispatch);
          localStorage.setItem("app_version", serverVersion);
          const dbConn = await openDB();
          const tx = dbConn.transaction("localSchemaVersion", "readwrite");
          tx.objectStore("localSchemaVersion").put({
            id: "schemaVersion",
            version: serverVersion,
          });
        }

        // 5️⃣ Watch for live changes
        return onSnapshot(configRef, (s) => {
          const next = s.exists() ? (s.data().schemaVersion as string) : null;
          const prev = localStorage.getItem("app_version");

          if (next && next !== prev) {
            dispatch(
              showMessage("New app version detected. Auto refreshing soon...")
            );
            dispatch(setVersions({ localVersion: prev, serverVersion: next }));

            // Schedule an auto refresh fallback
            if (!window.__autoReloadTimer) {
              window.__autoReloadTimer = setTimeout(async () => {
                console.log("🔁 Auto-refreshing app after delay...");
                await resetApp(dispatch);
                safeReload();
              }, 60000);
            }
          }
        });
      } catch (err) {
        console.error("❌ Failed schemaVersion sync:", err);
      }
    };

    const unsubPromise = syncVersion();

    return () => {
      unsubPromise.then((unsub) => {
        if (typeof unsub === "function") unsub();
      });
    };
  }, [dispatch]);
};
