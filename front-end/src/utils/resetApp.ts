// utils/resetApp.ts
import {
  clearCompanyProductsFromIndexedDB,
  clearGoalsFromIndexedDB,
  clearHashtagPostsInIndexedDB,
  clearIndexedDBStore,
  clearPostsInIndexedDB,
  clearStarTagPostsInIndexedDB,
  clearUserCreatedPostsInIndexedDB,
  setLastSeenTimestamp,
} from "../utils/database/indexedDBUtils";
import { AppDispatch } from "../utils/store";
import { clearPostsData } from "../Slices/postsSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { openDB } from "./database/indexedDBOpen";

let reloadTimer: ReturnType<typeof setTimeout> | null = null;

export function safeReload(delay = 500) {
  if (reloadTimer) return; // ✅ prevent double reloads
  reloadTimer = setTimeout(() => {
    window.location.reload();
  }, delay);
}

// utils/resetApp.ts
export async function resetApp(dispatch: AppDispatch) {
  try {
    console.log("🧹 Starting app reset...");

    await Promise.all([
      clearPostsInIndexedDB(),
      clearUserCreatedPostsInIndexedDB(),
      clearHashtagPostsInIndexedDB(),
      clearStarTagPostsInIndexedDB(),
      clearGoalsFromIndexedDB("galloGoals"),
      clearGoalsFromIndexedDB("companyGoals"),
      clearGoalsFromIndexedDB("allGalloGoals"),
      clearGoalsFromIndexedDB("allCompanySpecificGoals"),
      clearCompanyProductsFromIndexedDB(),
      clearIndexedDBStore("userAccounts_v2"),
      clearIndexedDBStore("allUsersCompanyAccounts"),
      clearIndexedDBStore("latestPosts"),
      clearIndexedDBStore("locations"),
      clearIndexedDBStore("collections"),
      clearIndexedDBStore("lastSeenTimestamp"),
      setLastSeenTimestamp("1970-01-01T00:00:00.000Z"),
    ]);

    console.log("✅ IndexedDB cleared.");
    dispatch(clearPostsData());
    dispatch(showMessage("✅ App data cleared. Reinitializing..."));

    // 🔥 Instead of reloading the page:
    // just clear schemaVersion flags to trigger a re-sync from Firestore
    const db = await openDB();
    const tx = db.transaction("localSchemaVersion", "readwrite");
    const store = tx.objectStore("localSchemaVersion");
    await store.delete("schemaVersion");
    sessionStorage.removeItem("schemaVersionSynced");

    // Trigger re-bootstrap manually if you’re using the new hook
    localStorage.removeItem("app_version");
    localStorage.removeItem("last_reset_version");

    console.log("🔄 Triggering local rebootstrap...");
    dispatch(showMessage("App reset complete — syncing fresh data..."));
    safeReload();

  } catch (error) {
    console.error("❌ App reset failed:", error);
    dispatch(showMessage("❌ Failed to reset app. Check console for details."));
  }
}
