import React, { useCallback } from "react";
import "./goalViewerFilters.css";

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
  // Optional: debounce typing if needed
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterSubmitted(e.target.value as "all" | "submitted" | "not-submitted");
  }, [setFilterSubmitted]);

  return (
    <div className="goal-viewer-filters">
      <label htmlFor="goal-search" className="sr-only">Search Accounts</label>
      <input
        id="goal-search"
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="Search by account name..."
        className="goal-filter-input"
      />

      <label htmlFor="goal-submission-filter" className="sr-only">Filter Submissions</label>
      <select
        id="goal-submission-filter"
        value={filterSubmitted}
        onChange={handleFilterChange}
        title="Filter Submissions" // ✅ Accessible name
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

