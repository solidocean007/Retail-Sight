// utils/resetApp.ts
import {
  clearCompanyProductsFromIndexedDB,
  clearGoalsFromIndexedDB,
  clearHashtagPostsInIndexedDB,
  clearIndexedDBStore,
  clearPostsInIndexedDB,
  clearStarTagPostsInIndexedDB,
  clearUserCreatedPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { AppDispatch } from "../utils/store";
import { clearPostsData } from "../Slices/postsSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { openDB } from "./database/indexedDBOpen";

export async function resetApp(dispatch: AppDispatch) {
  try {
    console.log("🧹 Starting app reset...");

    // Clear IndexedDB stores
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
    ]);

    console.log("✅ IndexedDB cleared.");

    // Clear Redux
    dispatch(clearPostsData());
    dispatch(showMessage("✅ App data cleared. Reloading..."));

    // Clear schemaVersion
    const db = await openDB();
    const tx = db.transaction("localSchemaVersion", "readwrite");
    const store = tx.objectStore("localSchemaVersion");
    store.delete("schemaVersion");

    sessionStorage.removeItem("schemaVersionSynced");

    // console.log("🔄 Reloading page...");
    // window.location.reload();
  } catch (error) {
    console.error("❌ App reset failed:", error);
    dispatch(showMessage("❌ Failed to reset app. Check console for details."));
  }
}
