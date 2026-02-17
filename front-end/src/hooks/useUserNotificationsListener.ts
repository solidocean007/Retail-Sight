import { useEffect } from "react";
import { useAppDispatch } from "../utils/store";
import { setupNotificationListenersForUser } from "../utils/listeners/setupNotificationListenersForUser";
import { UserType } from "../utils/types";

export function useUserNotificationsListener(user: UserType | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user) return;

    const unsub = dispatch(
      setupNotificationListenersForUser(user)
    ) as unknown as () => void;

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [user?.uid, dispatch]);
}
