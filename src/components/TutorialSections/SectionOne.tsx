// SectionOne.jsx
import './tutorial-section.css'
const SectionOne = () => {
  return (
    <div className="tutorial-section">
      <h2>Accessing the Capture Feature:</h2>
      <ol>
        <li>
          On a desktop, click the 'Capture' button in the top right-hand corner.
        </li>
        <li>On mobile, access the 'Capture' button via the three-line menu.</li>
      </ol>
      {/* Add more content, images, etc. */}
      <div className="section-one-image-box">
        <img src="src/assets/section-one-image.jpg" alt="" />
      </div>
    </div>
  );
};

export default SectionOne;

// Similarly, create SectionTwo.jsx, SectionThree.jsx, etc.
