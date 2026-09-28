import { useCallback, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

import {
  deleteNotification,
  markAllAsReadLocal,
  markAsReadLocal,
} from "../Slices/notificationsSlice";
import { removeNotification } from "../thunks/notificationsThunks";
import { UserNotificationType } from "../utils/types";
import { useAppDispatch } from "../utils/store";

type NotificationClickSource = "modal" | "dropdown" | "push";

export const useNotificationActions = () => {
  const dispatch = useAppDispatch();
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const functions = useMemo(() => getFunctions(), []);

  const markReadCallable = useMemo(
    () => httpsCallable(functions, "markNotificationReadCallable"),
    [functions],
  );
  const markAllReadCallable = useMemo(
    () => httpsCallable(functions, "markAllNotificationsReadCallable"),
    [functions],
  );
  const trackClickCallable = useMemo(
    () => httpsCallable(functions, "trackNotificationClickCallable"),
    [functions],
  );

  const markRead = useCallback(
    async (notification: UserNotificationType) => {
      if (notification.readAt) return;

      dispatch(
        markAsReadLocal({
          notificationId: notification.id,
          readAt: new Date().toISOString(),
        }),
      );

      try {
        await markReadCallable({ notificationId: notification.id });
      } catch (error) {
        console.error("markNotificationRead failed:", error);
      }
    },
    [dispatch, markReadCallable],
  );

  const markAllRead = useCallback(async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
    dispatch(markAllAsReadLocal(new Date().toISOString()));

    try {
      await markAllReadCallable({});
    } catch (error) {
      console.error("markAllNotificationsRead failed:", error);
    } finally {
      setMarkingAllRead(false);
    }
  }, [dispatch, markAllReadCallable, markingAllRead]);

  const trackClick = useCallback(
    async (notificationId: string, source: NotificationClickSource) => {
      try {
        await trackClickCallable({ notificationId, source });
      } catch (error) {
        console.error("trackNotificationClick failed:", error);
      }
    },
    [trackClickCallable],
  );

  const remove = useCallback(
    async (notificationId: string) => {
      try {
        await dispatch(removeNotification({ notificationId })).unwrap();
        dispatch(deleteNotification(notificationId));
      } catch (error) {
        console.error("removeNotification failed:", error);
        throw error;
      }
    },
    [dispatch],
  );

  return {
    markRead,
    markAllRead,
    markingAllRead,
    trackClick,
    remove,
  };
};
