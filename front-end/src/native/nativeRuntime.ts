import { App, type RestoredListenerEvent } from "@capacitor/app";
import { Network, type ConnectionStatus } from "@capacitor/network";
import { isNativePlatform } from "../utils/platform";

export const NATIVE_APP_RESTORED_EVENT = "displaygram:native-app-restored";
export const NATIVE_APP_RESUMED_EVENT = "displaygram:native-app-resumed";
export const NATIVE_NETWORK_STATUS_EVENT = "displaygram:native-network-status";

const emitNetworkStatus = (status: ConnectionStatus) => {
  window.dispatchEvent(
    new CustomEvent<ConnectionStatus>(NATIVE_NETWORK_STATUS_EVENT, {
      detail: status,
    }),
  );
};

/**
 * Register native lifecycle listeners before React renders. The offline queue
 * will consume these events to recover interrupted camera results and resume
 * foreground synchronization when the app or network becomes active.
 */
export const initializeNativeRuntime = async (): Promise<void> => {
  if (!isNativePlatform()) return;

  await Promise.all([
    App.addListener("appRestoredResult", (result: RestoredListenerEvent) => {
      window.dispatchEvent(
        new CustomEvent<RestoredListenerEvent>(NATIVE_APP_RESTORED_EVENT, {
          detail: result,
        }),
      );
    }),
    App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) window.dispatchEvent(new Event(NATIVE_APP_RESUMED_EVENT));
    }),
    Network.addListener("networkStatusChange", emitNetworkStatus),
  ]);

  emitNetworkStatus(await Network.getStatus());
};
