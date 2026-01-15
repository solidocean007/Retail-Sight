// components/SmartLanding.tsx
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import CircularProgress from "@mui/material/CircularProgress";

export default function SmartLanding() {
  const currentUser = useSelector(
    (state: RootState) => state.user.currentUser
  );

  const appReady = useSelector(
    (state: RootState) => state.app.appReady
  );

  // ⛔ Hard gate until auth + bootstrap settles
  if (!appReady && currentUser !== null) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }

  return currentUser
    ? <Navigate to="/user-home-page" replace />
    : <Navigate to="/splash" replace />;
}
