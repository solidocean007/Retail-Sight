// DateSelector.tsx
import React, { useState } from "react";
import { DatePicker } from "@mui/x-date-pickers";
import { Dayjs } from "dayjs";
import "./manualGalloProgramImport.css";

interface ManualGalloProgramImportProps {
  startDate: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onFetchPrograms: () => void;
  disabled?: boolean;
}

const ManualGalloProgramImport: React.FC<ManualGalloProgramImportProps> = ({
  startDate,
  onDateChange,
  onFetchPrograms,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`date-selector ${disabled ? "is-disabled" : ""}`}>
      <header className="manual-gallo-import-header">
        <h3>🔁 Manual Gallo Axis Program Search</h3>

        <button
          className="link-button"
          onClick={() => setExpanded((v) => !v)}
          disabled={disabled}
        >
          {expanded ? "Hide details ▲" : "Show details ▼"}
        </button>
      </header>

      {expanded && (
        <>
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

          <button
            className="btn-secondary"
            onClick={onFetchPrograms}
            disabled={disabled || !startDate}
          >
            Manual Program Lookup
          </button>

          {disabled && (
            <div className="date-selector-hint">
              Clear programs to change the start date
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManualGalloProgramImport;
