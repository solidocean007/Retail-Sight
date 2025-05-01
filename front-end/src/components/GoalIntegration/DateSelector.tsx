// DateSelector.tsx
import React from "react";
import { DatePicker } from "@mui/x-date-pickers";
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
    <Box sx={{ display: "flex", flexDirection: "column" }}>
         <DatePicker
            label="Start Date"
            value={startDate}
            onChange={onDateChange}
            // sx={{ width: "20%" }}
            slotProps={{
              textField: { fullWidth: false, margin: "normal",

                InputProps: {
                  sx: { textAlign: "center", input: { textAlign: "center" } }, // Center input text
                },
               },
              
            }}
          />
        <Button variant="contained" color="primary" onClick={onFetchPrograms}>
          Search Programs
        </Button>
      </Box>
  );
};

export default DateSelector;
