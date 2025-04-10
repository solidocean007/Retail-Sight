import React from "react";
import "./goalViewerFilters.css"; // optional: if you want styles

interface GoalViewerFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterSubmitted: "all" | "submitted" | "not-submitted";
  setFilterSubmitted: (value: "all" | "submitted" | "not-submitted") => void;
}

const GoalViewerFilters: React.FC<GoalViewerFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterSubmitted,
  setFilterSubmitted,
}) => {
  return (
    <div className="goal-viewer-filters">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search by account name..."
        className="goal-filter-input"
      />
      <select
        value={filterSubmitted}
        onChange={(e) =>
          setFilterSubmitted(e.target.value as "all" | "submitted" | "not-submitted")
        }
        className="goal-filter-select"
      >
        <option value="all">All</option>
        <option value="submitted">Submitted</option>
        <option value="not-submitted">Not Submitted</option>
      </select>
    </div>
  );
};

export default GoalViewerFilters;
