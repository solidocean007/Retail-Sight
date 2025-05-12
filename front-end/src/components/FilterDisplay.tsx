import React from "react";

// Define prop types for better type checking
interface FilterDisplayProps {
  selectedChannels: string[];
  selectedCategories: string[];
}

const FilterDisplay: React.FC<FilterDisplayProps> = ({
  selectedChannels,
  selectedCategories,
}) => {
  // Helper function to format the display text
  const formatDisplayText = (filters: string[]) =>
    filters.length > 0 ? filters.join(", ") : "None";

  return (
    <div>
      {/* Only display sections if there are selected items */}
      {selectedChannels.length > 0 && (
        // <div>Channels: {formatDisplayText(selectedChannels)}</div>
        <div>Channel: {formatDisplayText(selectedChannels)}</div>
      )}
      {selectedCategories.length > 0 && (
        <div>Categories: {formatDisplayText(selectedCategories)}</div>
      )}
      {/* Display a message if no filters are selected */}
      {selectedChannels.length === 0 && selectedCategories.length === 0 && (
        <div>No filters selected.</div>
      )}
    </div>
  );
};

export default FilterDisplay;
