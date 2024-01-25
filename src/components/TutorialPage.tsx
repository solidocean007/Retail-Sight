import { useState } from "react";
import "./Tutorial.css"; // Assuming you have a separate CSS file
import { Helmet } from "react-helmet";
import SectionOne from "./TutorialSections/SectionOne";
import SectionTwo from "./TutorialSections/SectionTwo";
import SectionThree from "./TutorialSections/SectionThree";
import SectionFour from "./TutorialSections/SectionFour";
import SectionFive from "./TutorialSections/SectionFive";
import { useNavigate } from "react-router-dom";
// Import other sections

const TutorialPage = () => {
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

  const sections = [<SectionOne />, <SectionTwo />, <SectionThree />, <SectionFour />, <SectionFive /> /* Add other sections here */];

  const renderFlipView = () => {
    return (
        <div>
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
     <Helmet>
          <title>Tutorial for Displaygram | Retail Display Instructions</title>
          <meta
            name="description"
            content="How to use Displaygram, the innovative platform for retail professionals. Manage and archive retail displays with ease, utilize location tagging, and enhance posts with rich descriptions. Join our community and streamline your display management today."
          />
        </Helmet>
    <div className="tutorial-container">
      <h1>Onboarding Tutorial</h1>
       <button
            className="nav-button"
            onClick={() => navigate("/user-home-page")}
          >
            Home
          </button>
        <button onClick={toggleViewMode}>
            Switch to {viewMode === 'flip' ? 'Scroll' : 'Flip-Through'} View
        </button>

        {viewMode === 'flip' ? renderFlipView() : renderScrollView()}
    </div>
    </>
    
  );
};

export default TutorialPage;

