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
  if (filteredCount === 0) {
    return (
      <div className="filter-summary-banner">
        <span>No posts match the selected filters.</span>
        <button className="btn-outline clear-filter-btn" onClick={onClear}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="filter-summary-banner">
      <div className="filter-summary-text">
        <span>
          Showing filtered post{filteredCount !== 1 && "s"} for:
          {filterText && ` ${filterText}`}
        </span>
        {fetchedAt && (
          <div className="fetched-at">
            as of {new Date(fetchedAt).toLocaleString()}
          </div>
        )}
      </div>

      <button className="btn-outline clear-filter-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
};

export default FilterSummaryBanner;
