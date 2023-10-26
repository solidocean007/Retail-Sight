import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { Provider } from "react-redux";
import store from "./utils/store.ts";
import "./index.css";
import "./utils/firebase.ts";
import { setUser } from "./Slices/userSlice.ts";

const userData = localStorage.getItem("userData");
if (userData) {
  store.dispatch(setUser(JSON.parse(userData)));
}

// render your App...

// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <React.StrictMode>
//       <Provider store={store}>
//         <App />
//       </Provider>
//   </React.StrictMode>
// );
ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);
