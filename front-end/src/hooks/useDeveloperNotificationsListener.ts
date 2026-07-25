// hooks/useDeveloperNotificationsListener.ts
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { setDeveloperNotifications } from "../Slices/developerNotificationSlice";
import { normalizeDeveloperNotification } from "../utils/normalize";

/**
 * Live listener for the developer messaging table.
 *
 * Replaces the one-shot fetch so newly sent messages appear immediately and
 * stats counters (read/clicked) tick up on their own. Developer-only surface
 * with low document volume, so the streaming read cost is negligible.
 */
export function useDeveloperNotificationsListener(enabled: boolean) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "developerNotifications"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        dispatch(
          setDeveloperNotifications(
            snap.docs.map((d) =>
              normalizeDeveloperNotification({ id: d.id, ...d.data() }),
            ),
          ),
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("developerNotifications listener failed:", err);
        setError(err.message || "Failed to load notifications");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [enabled, dispatch]);

  return { loading, error };
}
