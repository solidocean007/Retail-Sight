import { Capacitor } from "@capacitor/core";

/**
 * Native containers use Capacitor plugins for device-only storage and
 * lifecycle behavior. The browser/PWA continues to use IndexedDB.
 */
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
