export const NATIVE_APP_RESTORED_EVENT = "displaygram:native-app-restored";
export const NATIVE_APP_RESUMED_EVENT = "displaygram:native-app-resumed";
export const NATIVE_NETWORK_STATUS_EVENT = "displaygram:native-network-status";

/**
 * The web build only needs stable event names. The native scaffold extends
 * this adapter with Capacitor App and Network listeners when it is enabled.
 */
export const initializeNativeRuntime = async (): Promise<void> => undefined;
