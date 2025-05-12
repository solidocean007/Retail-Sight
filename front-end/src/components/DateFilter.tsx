import React from "react";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import "./dateFilter.css"; // Import your CSS file

interface DateFilterProps {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  onDateChange: (dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ dateRange, onDateChange }) => {
  return (
    <div className="date-filter-box">
      <div className="start-filter">
        <DatePicker
          label="Start Date"
          value={dateRange.startDate ? dayjs(dateRange.startDate) : null}
          onChange={(newValue: Dayjs | null) =>
            onDateChange({
              ...dateRange,
              startDate: newValue ? newValue.toDate() : null,
            })
          }
          slotProps={{
            textField: {
              fullWidth: true,
              variant: "standard", // Avoid default outlined borders
              InputProps: { disableUnderline: true },
              className: "date-picker-input",
            },
          }}
        />
      </div>

      <div className="end-filter">
        <DatePicker
          label="End Date"
          value={dateRange.endDate ? dayjs(dateRange.endDate) : null}
          onChange={(newValue: Dayjs | null) =>
            onDateChange({
              ...dateRange,
              endDate: newValue ? newValue.toDate() : null,
            })
          }
          slotProps={{
            textField: {
              fullWidth: true,
              variant: "standard", // Avoid default outlined borders
              InputProps: { disableUnderline: true },
              className: "date-picker-input",
            },
          }}
        />
      </div>
    </div>
  );
};

export default DateFilter;
