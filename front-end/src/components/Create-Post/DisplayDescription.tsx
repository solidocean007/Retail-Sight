import { useState, useEffect } from "react";
import { PostInputType } from "../../utils/types";
import "./displayDescription.css";

interface DisplayDescriptionProps {
  post: PostInputType;
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType],
  ) => void;
}

export const DisplayDescription: React.FC<DisplayDescriptionProps> = ({
  post,
  onNext,
  onPrevious,
  handleFieldChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [description, setDescription] = useState(post.description);

  useEffect(() => {
    // Keep the parent post description in sync with the local state
    handleFieldChange("description", description);
  }, [description, handleFieldChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!description) return;
    const lastChar = description[description.length - 1];
    // Disable space if the last character is # or *
    if ((lastChar === "#" || lastChar === "*") && e.key === " ") {
      e.preventDefault(); // Prevent space from being entered
    }
  };

  return (
    <div className="display-description">
      <button className="create-post-btn" onClick={onPrevious}>
        Back
      </button>
      <div className="display-description-instructions">
        <h2>Display Description</h2>
        <p>
          Add a description for the display. You can use{" "}
          <span className="highlight">#</span> for hashtags and{" "}
          Example #flag, #valentines, #halloween
          {/* <span className="highlight">*</span> for mentions. */}
        </p>
      </div>
      <div className={`text-area-container ${isFocused ? "focused" : ""}`}>
        <label
          htmlFor="description-box"
          className={`placeholder ${isFocused ? "active" : ""}`}
        >
          Description
        </label>
        <textarea
          className="description-text-area"
          name="description-box"
          id="description-box"
          rows={4}
          value={description}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown} // Add keydown handler to disable spacebar
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          color="primary"
        ></textarea>
      </div>
      <button className="create-post-btn" onClick={onNext}>
        <h4>Next</h4>
      </button>
    </div>
  );
};
