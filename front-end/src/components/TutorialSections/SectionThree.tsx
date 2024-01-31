// SectionThree.jsx
import './tutorial-section.css'
const SectionThree = () => {
  return (
    <div className="tutorial-section">
      <h2>Selecting the Store and Entering Details:</h2>
      <ol>
        <li>
          Use the map to click on the store you're in, and adjust the
          auto-filled store name if necessary (e.g., remove 'Pharmacy' or other
          descriptions).
        </li>
        <li>
          Enter the store number in the designated input, omitting the hashtag
          (e.g., '25').
        </li>
      </ol>
      {/* Add more content, images, etc. */}
      <div className="section-one-image-box">
        <img src="/assets/section-three-image.jpg" alt="" />
      </div>
    </div>
  );
};

export default SectionThree;

// Similarly, create SectionTwo.jsx, SectionThree.jsx, etc.
