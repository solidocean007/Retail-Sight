import React from "react";
import { PostType } from "../utils/types";
import CategorySelector, { CategoryType } from "./CategorySelector";
import ChannelSelector, { ChannelType } from "./ChannelSelector";
import TotalCaseCount from "./TotalCaseCount";

interface SetDisplayDetailsProps {
  handleFieldChange: (field: keyof PostType, value: PostType[keyof PostType]) => void;
  selectedChannel: ChannelType;
  setSelectedChannel: React.Dispatch<React.SetStateAction<ChannelType>>;
  selectedCategory: CategoryType;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryType>>;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  handleFieldChange,
  selectedChannel,
  setSelectedChannel,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="setDisplayDetails">
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
      </div>
    </div>
  );
};
