import React, { useEffect, useState } from "react";
import "./totalCaseCount.css";
import { TextField } from "@mui/material";

interface TotalCaseCountProps {
  handleTotalCaseCountChange: (caseCount: number) => void;
  initialValue?: number;
}

const TotalCaseCount: React.FC<TotalCaseCountProps> = ({
  handleTotalCaseCountChange,
  initialValue = 1, // fallback to 1 if undefined
}) => {
  const [value, setValue] = useState(initialValue);

  // Sync parent when internal value changes
  useEffect(() => {
    handleTotalCaseCountChange(value);
  }, [value, handleTotalCaseCountChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    const caseCount = isNaN(parsed) || parsed < 1 ? 1 : parsed;

    setValue(caseCount);
  };

  return (
    <div className="total-case-count-box">
      <label htmlFor="quantity">Quantity:</label>
      <TextField
        fullWidth={false} // you can toggle fullWidth or give a fixed width via sx
        variant="outlined"
        // label="Quantity"
        type="number"
        value={value}
        onChange={handleChange}
        inputProps={{ min: 1 }}
        sx={{
          mb: 2,
          width: "100px", // match your desired size
          "& .MuiInputBase-input": {
            textAlign: "center",
            fontSize: "1.5rem",
            padding: "0.5rem 1rem",
          },
        }}
      />
    </div>
  );
};

export default TotalCaseCount;
