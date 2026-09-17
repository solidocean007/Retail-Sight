import { useEffect, useState } from "react";
import { PostInputType } from "../../utils/types";
import "./displayDescription.css";

interface DisplayDescriptionProps {
  post: PostInputType;
  isSupplier: boolean;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType],
  ) => void;
}

export const DisplayDescription: React.FC<DisplayDescriptionProps> = ({
  post,
  isSupplier,
  handleFieldChange,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [description, setDescription] = useState(post.description);
  const distributorName =
    post.account?.originCompanyName || "the connected distributor";
  const showShareNote = isSupplier && !!post.account?.originCompanyId;

  useEffect(() => {
    handleFieldChange("description", description);
  }, [description, handleFieldChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!description) return;
    const lastChar = description[description.length - 1];

    if ((lastChar === "#" || lastChar === "*") && e.key === " ") {
      e.preventDefault();
    }
  };

  return (
    <div className="display-description">
      <div className="display-description-instructions">
        <h2>Display Description</h2>
        <h3>Optional</h3>
        <p>
          Add a description for the display. You can use{" "}
          <span className="highlight">#</span> for hashtags. Example #flag,
          #valentines, #halloween
        </p>
      </div>

      <div className={"text-area-container " + (isFocused ? "focused" : "")}>
        <label
          htmlFor="description-box"
          className={"placeholder " + (isFocused ? "active" : "")}
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
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          color="primary"
        />
      </div>

      {showShareNote && (
        <div className="supplier-share-note">
          <label htmlFor="supplier-share-note">
            Message for {distributorName}
            <span>Optional</span>
          </label>
          <p>
            Explain why you are sharing this display or what their team should
            notice. This message appears with the card in their Shared feed.
          </p>
          <textarea
            id="supplier-share-note"
            className="description-text-area supplier-share-note-input"
            rows={3}
            maxLength={400}
            value={post.shareNote ?? ""}
            placeholder="Example: New fall program display—use this as a starting point for larger grocery accounts."
            onChange={(event) =>
              handleFieldChange("shareNote", event.target.value)
            }
          />
        </div>
      )}
    </div>
  );
};
