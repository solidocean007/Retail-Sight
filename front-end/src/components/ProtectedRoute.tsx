import { Navigate, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import AppLoadingScreen from "./AppLoadingScreen";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser, initializing } = useFirebaseAuth();
  const location = useLocation();

  // Wait for Firebase to restore session
  if (initializing) {
    return <AppLoadingScreen show message="Restoring session…" />;
  }

  // No user after auth resolved
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
