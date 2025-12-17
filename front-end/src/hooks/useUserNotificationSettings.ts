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
};

// --------------------------------------------------
// Hook
// --------------------------------------------------
export function useUserNotificationSettings() {
  const [settings, setSettings] = useState<UserNotificationSettings | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Load settings
  const loadSettings = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return;

    setLoading(true);
    const ref = doc(db, `users/${current.uid}/notificationSettings/settings`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // initialize with defaults
      await setDoc(
        ref,
        {
          ...defaultNotificationSettings,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSettings(defaultNotificationSettings);
    } else {
      setSettings(snap.data() as UserNotificationSettings);
    }

    setLoading(false);
  }, []);

  const ALLOWED_KEYS: (keyof UserNotificationSettings)[] = [
    "likes",
    "comments",
    "commentLikes",
    "goalAssignmentPush",
    "supervisorDisplayAlerts",
    "developerAnnouncements",
  ];

  const updateSetting = useCallback(
    async (key: keyof UserNotificationSettings, value: boolean) => {
      if (!ALLOWED_KEYS.includes(key)) return;

      const current = auth.currentUser;
      if (!current) return;

      const ref = doc(db, `users/${current.uid}/notificationSettings/settings`);
      await updateDoc(ref, { [key]: value });

      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
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
    updateSetting,
    reload: loadSettings,
  };
}
