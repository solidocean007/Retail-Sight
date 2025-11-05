import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import "./backNavBar.css";

const BackNavBar = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1); // go back if possible
    } else {
      navigate("/"); // fallback to splash or home
    }
  };

  return (
    <div className="back-navbar">
      <button onClick={handleBack} className="back-btn">
        <ArrowBack className="back-icon" />
        <span>Back</span>
      </button>
    </div>
  );
};

export default BackNavBar;
