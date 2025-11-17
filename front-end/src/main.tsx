// main.tsx
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import store from "./utils/store.ts";
import "./index.css";
import "./styles/theme.css";
import "./utils/firebase.ts";
import { HelmetProvider } from "react-helmet-async";
import { register as registerServiceWorker } from "./serviceWorkerRegistration";

registerServiceWorker();

const savedTheme = localStorage.getItem("theme");
const prefersDark = savedTheme === "dark";

// Apply theme attribute to body early
document.body.setAttribute("data-theme", prefersDark ? "dark" : "light");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </HelmetProvider>
);
