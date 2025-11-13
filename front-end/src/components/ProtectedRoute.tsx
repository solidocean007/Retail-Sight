// components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser, initializing } = useFirebaseAuth();
  const location = useLocation();

  // still loading auth → show nothing (App.tsx handles the loader)
  if (initializing) return null;

  // no user → redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // authenticated → show children
  return children;
};

export default ProtectedRoute;
