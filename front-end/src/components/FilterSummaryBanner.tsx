import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import "./filterSummaryBanner.css";

interface FilterSummaryBannerProps {
  onClear: () => void;
  onEdit: () => void;
  isLoading?: boolean;
}

const FilterSummaryBanner = ({
  onClear,
  onEdit,
  isLoading = false,
}: FilterSummaryBannerProps) => {
  return (
    <section
      className={`filter-summary-banner${isLoading ? " is-loading" : ""}`}
      aria-live="polite"
      aria-busy={isLoading}
      aria-label={isLoading ? "Updating filtered feed" : "Filters are active"}
    >
      <div className="filter-summary-banner__state">
        <span className="filter-summary-banner__icon" aria-hidden="true">
          {isLoading ? <RefreshRoundedIcon /> : <TuneRoundedIcon />}
        </span>
        <strong>{isLoading ? "Updating…" : "Filters active"}</strong>
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
