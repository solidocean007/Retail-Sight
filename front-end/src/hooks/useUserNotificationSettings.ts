import { useEffect, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../utils/firebase";

/**
 * User notification preferences.
 * These settings DO NOT affect required / transactional emails
 * such as goal assignments or access changes.
 */

// --------------------------------------------------
// Firestore Document Shape
// --------------------------------------------------
export interface UserNotificationSettings {
  likes: boolean;
  comments: boolean;
  commentLikes: boolean;
  goalAssignmentPush: boolean;
  supervisorDisplayAlerts: boolean;
  developerAnnouncements: boolean;
  emailComments?: boolean;
  emailGoalAssignments?: boolean;
  emailWeeklySummary?: boolean;

  // optional future expansion
  quietHours?: {
    start: string; // "21:00"
    end: string; // "07:00"
  };
}

// Default values applied for new users
export const defaultNotificationSettings: UserNotificationSettings = {
  likes: true,
  comments: true,
  commentLikes: true,
  goalAssignmentPush: true,
  supervisorDisplayAlerts: true,
  developerAnnouncements: true,

  emailComments: true,
  emailGoalAssignments: true,
  emailWeeklySummary: false,
};

const ALLOWED_KEYS: (keyof UserNotificationSettings)[] = [
  "likes",
  "comments",
  "commentLikes",
  "goalAssignmentPush",
  "supervisorDisplayAlerts",
  "developerAnnouncements",
  "emailComments",
  "emailGoalAssignments",
  "emailWeeklySummary",
];

// --------------------------------------------------
// Hook
// --------------------------------------------------
export function useUserNotificationSettings() {
  const [settings, setSettings] = useState<UserNotificationSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<
    keyof UserNotificationSettings | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Load settings
  const loadSettings = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;

    setLoading(true);
    setError(null);

    try {
      const ref = doc(db, `users/${current.uid}/notificationSettings/settings`);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(
          ref,
          {
            ...defaultNotificationSettings,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );

        setSettings(defaultNotificationSettings);
      } else {
        setSettings({
          ...defaultNotificationSettings,
          ...(snap.data() as Partial<UserNotificationSettings>),
        });
      }
    } catch (loadError) {
      console.error("Failed to load notification settings:", loadError);
      setError("Notification preferences could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSetting = useCallback(
    async (key: keyof UserNotificationSettings, value: boolean) => {
      if (!ALLOWED_KEYS.includes(key)) return;

      const current = auth.currentUser;
      if (!current || savingKey) return;

      const ref = doc(db, `users/${current.uid}/notificationSettings/settings`);
      const previousValue = settings?.[key];
      setSavingKey(key);
      setError(null);
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

      try {
        await updateDoc(ref, {
          [key]: value,
          updatedAt: serverTimestamp(),
        });
      } catch (updateError) {
        console.error("Failed to update notification setting:", updateError);
        setSettings((prev) =>
          prev && typeof previousValue === "boolean"
            ? { ...prev, [key]: previousValue }
            : prev,
        );
        setError("That preference could not be saved. Please try again.");
      } finally {
        setSavingKey(null);
      }
    },
    [savingKey, settings],
  );

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) loadSettings();
      else setSettings(null);
    });

    return () => unsub();
  }, [loadSettings]);

  return {
    settings,
    loading,
    savingKey,
    error,
    updateSetting,
    reload: loadSettings,
  };
}
