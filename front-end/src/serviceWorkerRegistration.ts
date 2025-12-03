export function register() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => console.log("SW registered:", reg))
      .catch((err) => console.error("SW registration failed:", err));
  }
}
