import { useState } from "react";
import "./Tutorial.css"; // Assuming you have a separate CSS file
import SectionOne from "./TutorialSections/SectionOne";
import SectionTwo from "./TutorialSections/SectionTwo";
import SectionThree from "./TutorialSections/SectionThree";
import SectionFour from "./TutorialSections/SectionFour";
import SectionFive from "./TutorialSections/SectionFive";
import { useNavigate } from "react-router-dom";
import { TutorialPageHelmet } from "../utils/helmetConfigurations";
// Import other sections

const TutorialViewer = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [viewMode, setViewMode] = useState("flip"); // 'flip' or 'scroll'
  const navigate = useNavigate();

  const toggleViewMode = () => {
    setViewMode(viewMode === "flip" ? "scroll" : "flip");
  };

  const handleNext = () => {
    setCurrentSection(currentSection + 1);
  };

  const handlePrevious = () => {
    setCurrentSection(currentSection - 1);
  };

  const sections = [
    <SectionOne />,
    <SectionTwo />,
    <SectionThree />,
    <SectionFour />,
    <SectionFive /> /* Add other sections here */,
  ];

  const renderFlipView = () => {
    return (
      <div className="flip-section">
        {sections[currentSection]}
        <div>
          {currentSection > 0 && (
            <button onClick={handlePrevious}>Previous</button>
          )}
          {currentSection < sections.length - 1 && (
            <button onClick={handleNext}>Next</button>
          )}
        </div>
      </div>
    );
  };

  const renderScrollView = () => {
    return (
      <div>
        {sections.map((section, index) => (
          <div key={index}>{section}</div>
        ))}
      </div>
    );
  };

  return (
    <>
      <TutorialPageHelmet />
      <div className="tutorial-container">
        <h1>Onboarding Tutorial</h1>

        <button onClick={toggleViewMode}>
          Switch to {viewMode === "flip" ? "Scroll" : "Flip-Through"} View
        </button>

        {viewMode === "flip" ? renderFlipView() : renderScrollView()}
      </div>
    </>
  );
};

export default TutorialViewer;
