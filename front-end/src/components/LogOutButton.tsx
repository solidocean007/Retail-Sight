import React from "react";
import { handleLogout } from "../utils/validation/authenticate";
import { useNavigate } from "react-router-dom";
import { resetStore, useAppDispatch } from "../utils/store";
import { closeAndDeleteIndexedDB } from "../utils/database/indexedDBUtils";
import { Button } from "@mui/material";
import { auth } from "../utils/firebase";
import { countUnsyncedCapturesForUser } from "../features/offlineCapture/offlineCaptureDb";

const LogOutButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogoutClick = async () => {
    try {
      console.log("Logout initiated");

      const userId = auth.currentUser?.uid;
      if (userId) {
        let pendingCaptureCount: number;
        try {
          pendingCaptureCount = await countUnsyncedCapturesForUser(userId);
        } catch (error) {
          console.warn("Unable to inspect offline captures before logout:", error);
          const shouldContinue = window.confirm(
            "Displaygram could not verify your saved offline displays. Offline data will remain on this device after sign-out. Continue?",
          );
          if (!shouldContinue) return;
          pendingCaptureCount = 0;
        }

        if (pendingCaptureCount > 0) {
          const shouldContinue = window.confirm(
            `You have ${pendingCaptureCount} unsynced display${
              pendingCaptureCount === 1 ? "" : "s"
            } saved on this device. They will remain locked to this account on this device after you sign out. Continue?`,
          );
          if (!shouldContinue) return;
        }
      }

      // Perform additional logout operations
      await handleLogout(); // Clear auth state here first

      // Clear IndexedDB
      console.log("Attempting to delete IndexedDB...");
      const deletePromise = closeAndDeleteIndexedDB();

      // Timeout in case the IndexedDB deletion hangs
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn("Forcing logout after timeout.");
          resolve();
        }, 5000); // 5-second timeout
      });

      await Promise.race([deletePromise, timeoutPromise]); // Race between actual deletion and timeout

      // Unregister any active service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            console.log("Unregistering service worker: ", registration);
            registration.unregister();
          });
        });
      }

      // Clear localStorage and Redux state
      console.log("Clearing localStorage and Redux state...");
      localStorage.clear();
      dispatch(resetStore());

      // Navigate to home page after logout process completes
      console.log("Navigating to home page...");
      navigate("/"); // Do not navigate before everything is cleared
    } catch (error) {
      console.error("There was an error during logout", error);
    }
  };

  return (
    <Button className="log-out-btn" onClick={onLogoutClick}>
      Log Out
    </Button>
  );
};

export default LogOutButton;
