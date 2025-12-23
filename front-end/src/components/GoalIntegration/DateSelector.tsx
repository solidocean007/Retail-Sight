// DateSelector.tsx
import React from "react";
import { DatePicker } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import { Button } from "@mui/material";
import "./dateSelector.css";

interface DateSelectorProps {
  startDate: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onFetchPrograms: () => void;
  disabled?: boolean;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  startDate,
  onDateChange,
  onFetchPrograms,
  disabled = false,
}) => {
  return (
    <div className={`date-selector ${disabled ? "is-disabled" : ""}`}>
      <DatePicker
        label="Start Date"
        value={startDate}
        onChange={onDateChange}
        disabled={disabled}
        slotProps={{
          textField: {
            size: "small",
          },
        }}
      />

      <Button
        variant="contained"
        onClick={onFetchPrograms}
        disabled={disabled}
      >
        Search Programs
      </Button>

      {disabled && (
        <div className="date-selector-hint">
          Clear programs to change the start date
        </div>
      )}
    </div>
  );
};

export default DateSelector;
