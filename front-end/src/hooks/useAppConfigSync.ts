import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { openDB } from "../utils/database/indexedDBOpen";

export function useAppConfigSync() {
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  useEffect(() => {
    const configRef = doc(db, "appConfig", "HlAAI92RInjZymlMiwqu");

    const unsubscribe = onSnapshot(configRef, async (docSnap) => {
      const server = docSnap.data()?.schemaVersion || null;
      setServerVersion(server);

      if (!server) return;

      try {
        const dbInstance = await openDB();
        const tx = dbInstance.transaction("localSchemaVersion", "readonly");
        const store = tx.objectStore("localSchemaVersion");
        const request = store.get("schemaVersion");

        request.onsuccess = () => {
          const local = request.result?.version;
          setLocalVersion(local);

          const alreadyReloaded = sessionStorage.getItem("schemaVersionSynced");

          if (!local || local !== server) {
            if (!alreadyReloaded) {
              const tx2 = dbInstance.transaction("localSchemaVersion", "readwrite");
              tx2.objectStore("localSchemaVersion").put({
                id: "schemaVersion",
                version: server,
              });

              sessionStorage.setItem("schemaVersionSynced", "true");

              setTimeout(() => {
                console.warn("🔁 Schema mismatch detected. Reloading app...");
                window.location.reload();
              }, 150);
            }
          } else {
            sessionStorage.setItem("schemaVersionSynced", "true");
          }
        };

        request.onerror = () => {
          console.error("❌ Failed to read local schema version");
          setLocalVersion("Error");
        };
      } catch (err) {
        console.error("❌ Error syncing schema versions:", err);
        setLocalVersion("Error");
      }
    });

    return () => unsubscribe();
  }, []);

  return { localVersion, serverVersion };
}
