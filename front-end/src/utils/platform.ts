import { Capacitor } from "@capacitor/core";

/**
 * Native containers use Capacitor plugins for device storage, lifecycle, and
 * notifications. Browser/PWA-only integrations stay outside those containers.
 */
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();
