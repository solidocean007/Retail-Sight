import React from "react";
import { PostType } from "../utils/types";
import CategorySelector, { CategoryType } from "./CategorySelector";
import ChannelSelector, { ChannelType } from "./ChannelSelector";
import TotalCaseCount from "./TotalCaseCount";
import { Button } from "@mui/material";

interface SetDisplayDetailsProps {
  onNext: () => void;
  onPrevious: () => void;
  handleFieldChange: (field: keyof PostType, value: PostType[keyof PostType]) => void;
  selectedChannel: ChannelType;
  setSelectedChannel: React.Dispatch<React.SetStateAction<ChannelType>>;
  selectedCategory: CategoryType;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryType>>;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  onNext,
  onPrevious,
  handleFieldChange,
  selectedChannel,
  setSelectedChannel,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="setDisplayDetails">
      <Button onClick={onPrevious}>Back</Button>
      <TotalCaseCount
        handleTotalCaseCountChange={(value) =>
          handleFieldChange("totalCaseCount", value)
        }
      />
      <div className="property-zone">
        <ChannelSelector
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
        />

        <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
};
