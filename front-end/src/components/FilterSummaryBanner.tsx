// FilterSummaryBanner.tsx
import React from "react";
import "./filterSummaryBanner.css";

interface FilterSummaryBannerProps {
  filteredCount: number;
  filterText: string;
  onClear: () => void;
  fetchedAt: string | null;
}

const FilterSummaryBanner: React.FC<FilterSummaryBannerProps> = ({
  filteredCount,
  filterText,
  onClear,
  fetchedAt,
}) => {
  return (
    <div className="filter-summary-banner">
      <span>
        Showing {filteredCount} filtered post{filteredCount !== 1 && "s"}{" "}
        {filterText && `• ${filterText}`}
        {fetchedAt && (
          <div className="fetched-at">
            as of {new Date(fetchedAt).toLocaleString()}
          </div>
        )}
      </span>
      <button className="btn-outline clear-filter-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
};

export default FilterSummaryBanner;
