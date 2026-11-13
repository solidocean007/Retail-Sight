import { Navigate } from "react-router-dom";

export default function SmartLanding({ signedIn }: { signedIn: boolean }) {
  // Workspace bootstrap starts on the destination route.
  return <Navigate to={signedIn ? "/user-home-page" : "/splash"} replace />;
}
