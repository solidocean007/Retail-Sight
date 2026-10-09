import { useCallback, useEffect, useState } from "react";
import {
  listOfflineCapturesForUser,
  OFFLINE_CAPTURE_CHANGED_EVENT,
} from "./offlineCaptureDb";
import type { OfflineCaptureRecord } from "./types";

export const useOfflineCapturesForUser = (userId?: string) => {
  const [captures, setCaptures] = useState<OfflineCaptureRecord[]>([]);

  const refresh = useCallback(() => {
    if (!userId) {
      setCaptures([]);
      return;
    }

    void listOfflineCapturesForUser(userId)
      .then((records) =>
        setCaptures(records.filter((record) => record.state !== "synced")),
      )
      .catch((error) =>
        console.warn("Unable to read saved posts on this device:", error),
      );
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
    return () =>
      window.removeEventListener(OFFLINE_CAPTURE_CHANGED_EVENT, refresh);
  }, [refresh]);

  return captures;
};
