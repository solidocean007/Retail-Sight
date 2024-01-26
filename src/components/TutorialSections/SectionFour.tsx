// SectionFour.jsx
import "./tutorial-section.css";
const SectionFour = () => {
  return (
    <div className="tutorial-section">
      <h2>Setting Display Details:</h2>
      <ol>
        <li>
          Choose the type of account (default: Grocery) and the product type
          (default: Beer).
        </li>
        <div className="section-one-image-box">
          <img src="src/assets/section-four-image-top.jpg" alt="" />
        </div>
        <li>Fill out the display description.</li>
        <li>
          Include the special tracking text starting with an asterisk '*' (e.g.,
          '*healy24nasty').
        </li>
        <div className="section-one-image-box">
          <img src="src/assets/section-four-image-bottom.jpg" alt="" />
        </div>
        <li>
          Optionally, add hashtags for personal categorization, avoiding
          redundant tags that match existing categories.
        </li>
        <li>
          Ensure that hashtag and startag texts are correctly formatted (not
          case sensitive and without spaces).
        </li>
      </ol>
      {/* Add more content, images, etc. */}
    </div>
  );
};

export default SectionFour;

// Similarly, create SectionTwo.jsx, SectionThree.jsx, etc.
