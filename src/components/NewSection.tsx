// NewSection.tsx
import { useNavigate } from "react-router";
import "./NewSection.css";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { showMessage } from "../Slices/snackbarSlice";

const NewSection = () => {
  const currentUser = useSelector(selectUser);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleDashboardClick = () => {
    switch (currentUser?.role) {
      case "developer":
        navigate("/developer-dashboard");
        break;
      case "super-admin":
      case "admin":
      case "employee":
        navigate("/dashboard");
        break;
      case "status-pending":
        dispatch(showMessage("Please contact an admin to verify"));
        break;
      default:
        // Handle unknown roles or no user
        dispatch(showMessage("Access denied or user not recognized"));
    }
  };

  // Determine button text based on user role
  const buttonText =
    currentUser?.role === "status-pending"
      ? "Verification Pending"
      : currentUser?.company || "No Company";

  return (
    <div className="new-section">
      <button onClick={handleDashboardClick}>{buttonText}</button>
    </div>
  );
};
export default NewSection;
