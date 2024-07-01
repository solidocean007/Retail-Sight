import { useNavigate } from "react-router-dom";
import LeftMessageBoard from "./LeftMessageBoard";
import "./leftSideBar.css";

const LeftSideBar = () => {
  const navigate = useNavigate();

  const handleTutorialClick = () => {
    navigate("/tutorial");
  };

  return (
    <div className="left-side-bar">
      {/* I need a better class name for the container below */}
      <button
        onClick={handleTutorialClick}
        className="onboarding-tutorial-intro-box"
      >
        Click for Onboarding Tutorial
      </button>
    </div>
  );
};

export default LeftSideBar;
