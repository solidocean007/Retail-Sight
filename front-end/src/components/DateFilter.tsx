// DateFilter.tsx
import React from "react";
import "./dateFilter.css";

interface DateFilterProps {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }
  onDateChange: (dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ dateRange, onDateChange }) => {
  const startDateString = dateRange.startDate ? dateRange.startDate.toISOString().split('T')[0] : '';
  const endDateString = dateRange.endDate ? dateRange.endDate.toISOString().split('T')[0] : '';

  return (
    <div className="date-filter-box">
      Start Date:
      <input
        type="date"
        value={startDateString}
        onChange={(e) => onDateChange({ ...dateRange, startDate: e.target.value ? new Date(e.target.value) : null })}
      />
      End Date:
      <input
        type="date"
        value={endDateString}
        onChange={(e) => onDateChange({ ...dateRange, endDate: e.target.value ? new Date(e.target.value) : null })}
      />
    </div>
  );
};

export default DateFilter;