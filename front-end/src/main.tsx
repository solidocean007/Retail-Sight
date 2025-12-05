// main.tsx
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import store from "./utils/store.ts";
import "./index.css";
import "./styles/theme.css";
import "./utils/firebase.ts";
import { HelmetProvider } from "react-helmet-async";

const savedTheme = localStorage.getItem("theme");
const prefersDark = savedTheme === "dark";

// Apply theme attribute to body early
document.body.setAttribute("data-theme", prefersDark ? "dark" : "light");

// -----------------------------------------
// SAFE SERVICE WORKER REGISTRATION (PWA + FCM)
// -----------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    // ❌ Safari iOS not installed → do NOT register
    if (isIOS && !isStandalone) {
      console.log("iOS Safari detected (not standalone) → skipping SW.");
      return;
    }

    // Register SW with small delay for hydration
    setTimeout(() => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("SW registered:", reg))
        .catch((err) => console.error("SW registration failed:", err));
    }, 300);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </HelmetProvider>
);
