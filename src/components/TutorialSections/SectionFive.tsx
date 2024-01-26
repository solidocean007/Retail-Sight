// SectionFive.jsx
import './tutorial-section.css'
const SectionFive = () => {
  return (
    <div className="tutorial-section">
      <h2>Finalizing and Uploading the Post:</h2>
      <ol>
        <li>
          Select the visibility of the post (default: Company only, with an
          option to change to public).
        </li>
        <li>Click 'Submit Post' for uploading.</li>
        <li>
          Note that the uploading time depends on your cellular connection, with
          an option to upload later if the signal is poor.
        </li>
        <li>
          After uploading, the post will appear in your feed on the home page,
          with an option to edit if necessary.
        </li>
      </ol>
      {/* Add more content, images, etc. */}
      <div className="section-one-image-box">
        <img src="src/assets/section-five-image.jpg" alt="" />
      </div>
    </div>
  );
};

export default SectionFive;

// Similarly, create SectionTwo.jsx, SectionThree.jsx, etc.
