import { useState } from "react";
import { PostType } from "../utils/types";
import './displayDescription.css'

interface DisplayDescriptionProps {
  post: PostType;
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
}

export const DisplayDescription: React.FC<DisplayDescriptionProps> = ({
  post,
  onNext,
  onPrevious,
  handleFieldChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="display-description">
      <button className="create-post-btn" onClick={onPrevious}>
        Back
      </button>
      <div className={`text-area-container ${isFocused ? 'focused' : ''}`}>
        <label htmlFor="description-box" className={`placeholder ${isFocused ? 'active' : ''}`}>
          Description
        </label>
        <textarea
          className="description-text-area"
          name="description-box"
          id="description-box"
          rows={4}
          placeholder={isFocused ? '' : 'Description'}
          value={post.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        ></textarea>
      </div>
      <button className="create-post-btn" onClick={onNext}>
        <h4>Next</h4>
      </button>
    </div>
  );
};
