// DateSelector.tsx
import React from "react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Dayjs } from "dayjs";
import { Button, Box } from "@mui/material";

interface DateSelectorProps {
  startDate: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onFetchPrograms: () => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  startDate,
  onDateChange,
  onFetchPrograms,
}) => {
  return (
    <Box>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={onDateChange}
          slotProps={{
            textField: { fullWidth: false, margin: "normal" },
          }}
        />
      </LocalizationProvider>
      <Button variant="contained" color="primary" onClick={onFetchPrograms}>
        Search Programs with Start Date
      </Button>
    </Box>
  );
};

export default DateSelector;

