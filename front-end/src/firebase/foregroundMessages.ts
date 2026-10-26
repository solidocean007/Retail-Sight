// The service worker already receives push events. Keep this listener separate
// from the Firebase Messaging SDK so foreground handling stays lightweight.
export type PushPayload = {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string };
};

export function subscribeToForegroundMessages(
  cb: (payload: PushPayload) => void,
) {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "FOREGROUND_PUSH") {
      cb(event.data.payload);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
