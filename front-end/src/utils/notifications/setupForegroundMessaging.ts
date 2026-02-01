import { getMessaging, onMessage } from "firebase/messaging";

export function setupForegroundMessaging() {
  if (!("Notification" in window)) return;

  const messaging = getMessaging();

  onMessage(messaging, (payload) => {
    if (Notification.permission !== "granted") return;

    const title =
      payload.notification?.title ||
      payload.data?.title ||
      "New Notification";

    const body =
      payload.notification?.body ||
      payload.data?.body ||
      "";

    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    });
  });
}
