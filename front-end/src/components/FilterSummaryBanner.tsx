// FilterSummaryBanner.tsx
import React from "react";
import "./filterSummaryBanner.css";

interface FilterSummaryBannerProps {
  filteredCount: number;
  filterText: string;
  onClear: () => void;
}

const FilterSummaryBanner: React.FC<FilterSummaryBannerProps> = ({
  filteredCount,
  filterText,
  onClear,
}) => {
  return (
    <div className="filter-summary-banner">
      <span>
        Showing {filteredCount} filtered post{filteredCount !== 1 && "s"} {filterText && `• ${filterText}`}
      </span>
      <button className="btn-outline clear-filter-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
};

export default FilterSummaryBanner;
