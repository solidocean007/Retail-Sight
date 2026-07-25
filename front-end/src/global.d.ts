declare global {
  interface Window {
    adsbygoogle: { [key: string]: unknown }[];
    __autoReloadTimer?: ReturnType<typeof setTimeout>;
    deferredPrompt: unknown | null;

    // Console-testing helpers exposed by src/firebase/messaging.ts
    registerFcmToken?: () => Promise<string | null>;
    requestNotificationPermission?: () => Promise<NotificationPermission>;
    subscribeToForegroundMessages?: (
      cb: (payload: import("./firebase/messaging").PushPayload) => void,
    ) => () => void;
    deleteFcmToken?: (uid: string, token: string) => Promise<void>;
  }

  // iOS Safari's non-standard PWA flag
  interface Navigator {
    standalone?: boolean;
  }
}

export {};
