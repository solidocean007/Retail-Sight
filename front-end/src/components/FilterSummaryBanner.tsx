import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import "./filterSummaryBanner.css";

interface FilterSummaryBannerProps {
  filteredCount: number;
  filterText: string;
  onClear: () => void;
  onEdit: () => void;
  fetchedAt: string | null;
  isLoading?: boolean;
}

const formatFetchedAt = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const FilterSummaryBanner = ({
  filteredCount,
  filterText,
  onClear,
  onEdit,
  fetchedAt,
  isLoading = false,
}: FilterSummaryBannerProps) => {
  const updatedAt = formatFetchedAt(fetchedAt);
  const isEmpty = !isLoading && filteredCount === 0;

  return (
    <section
      className={`filter-summary-banner${isLoading ? " is-loading" : ""}${
        isEmpty ? " is-empty" : ""
      }`}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className="filter-summary-banner__icon" aria-hidden="true">
        {isLoading ? <RefreshRoundedIcon /> : <FilterAltOutlinedIcon />}
      </div>

      <div className="filter-summary-banner__copy">
        <strong>
          {isLoading
            ? "Updating displays…"
            : isEmpty
              ? "No displays match"
              : `${filteredCount} display${filteredCount === 1 ? "" : "s"} match`}
        </strong>
        {filterText && <span>{filterText}</span>}
        {!isLoading && updatedAt && <small>Updated {updatedAt}</small>}
      </div>

      <div className="filter-summary-banner__actions">
        <button type="button" className="filter-summary-edit" onClick={onEdit}>
          Adjust filters
        </button>
        <button
          type="button"
          className="filter-summary-clear"
          onClick={onClear}
        >
          Clear all
        </button>
      </div>
    </section>
  );
};

export default FilterSummaryBanner;
