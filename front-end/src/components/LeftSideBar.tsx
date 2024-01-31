import { useNavigate } from "react-router-dom";
import LeftMessageBoard from "./LeftMessageBoard";
import "./leftSideBar.css";
import NewSection from "./NewSection";

const LeftSideBar = () => {
  const navigate = useNavigate();

 const handleTutorialClick = () => {
  navigate('/tutorial')
 }

  return (
    <div className="left-side-bar">
        <NewSection />

      <LeftMessageBoard />
      {/* I need a better class name for the container below */}
      <div onClick={handleTutorialClick} className="onboarding-tutorial-intro-box">
        <h4>Click here for</h4>
        <h4>Onboarding Tutorial</h4>
      </div>
    </div>
  );
};

export default LeftSideBar;
