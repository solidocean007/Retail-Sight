import React from "react";
import CategorySelector, { CategoryType } from "../CategorySelector";
import ChannelSelector, { ChannelType } from "../ChannelSelector";
import "./setDisplayDetails.css";

interface SetDisplayDetailsProps {
  onNext: () => void;
  onPrevious: () => void;
  selectedChannel: ChannelType;
  setSelectedChannel: React.Dispatch<React.SetStateAction<ChannelType>>;
  selectedCategory: CategoryType;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryType>>;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  onNext,
  onPrevious,
  selectedChannel,
  setSelectedChannel,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="setDisplayDetails">
      <button className="create-post-btn" onClick={onPrevious}>
        Back
      </button>
      <div className="property-zone">
        <ChannelSelector
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
        />

        <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>
      <button className="create-post-btn" onClick={onNext}>
        Next
      </button>
    </div>
  );
};
