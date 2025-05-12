// SectionFour.jsx
import "./tutorial-section.css";
const SectionFour = () => {
  return (
    <div className="tutorial-section">
      <h2>Setting Display Details:</h2>
      <p>
        Optimize your post descriptions with specific tagging formats to improve
        visibility and access:
      </p>
      <ol>
        <li>
          Choose the type of account (default: Grocery) and the product type
          (default: Beer).
        </li>
        <div className="section-one-image-box">
          <img
            src="/assets/section-four-image-top.jpg"
            alt="Choosing account and product type"
          />
        </div>
        <li>Fill out the display description clearly and concisely.</li>
        <li>
          <strong>Hashtags (#):</strong> Use hashtags for personal
          categorization or to highlight special features not covered by
          existing categories. Avoid using redundant hashtags that overlap with
          chosen categories. For instance, instead of #wine, #beer, #grocery,
          use specific hashtags like #apothic or #lite to denote unique
          characteristics or brands. Ensure there are no spaces within a
          hashtag, e.g., #ValentinesDay.
        </li>
        <li>
          <strong>Startags (*):</strong> Startags serve as exclusive access keys
          for specific audiences. When you need to grant external access to an
          image or post, include a startag, which acts like a password. Each
          display will have a unique startag assigned, such as *healy24nasty or
          *craft-rack2024. Remember, the startag should start with an asterisk
          (*) followed by the identifier, without any spaces between them.
        </li>
        <div className="section-one-image-box">
          <img
            src="/assets/section-four-image-bottom.jpg"
            alt="Formatting hashtags and startags"
          />
        </div>
        <li>
          Always ensure that both hashtags and startags are formatted correctly:
          they are not case sensitive, but must be written without any spaces.
          This consistency aids in the efficient organization and retrieval of
          posts.
        </li>
      </ol>
      <p>
        By adhering to these guidelines, your posts will be more organized,
        accessible, and discoverable by the intended audience.
      </p>
      {/* Add more content, images, etc. as needed */}
    </div>
  );
};

export default SectionFour;

// Similarly, create SectionTwo.jsx, SectionThree.jsx, etc.
