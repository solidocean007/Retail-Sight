import { registerPlugin } from "@capacitor/core";
import type { PushNotificationsPlugin } from "@capacitor/push-notifications";

// Register the installed native plugin without importing its web adapter into
// the browser bundle. The native bridge is loaded only on Android.
export const NativePushNotifications =
  registerPlugin<PushNotificationsPlugin>("PushNotifications");
