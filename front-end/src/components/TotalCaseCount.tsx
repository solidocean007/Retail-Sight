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
  const [value, setValue] = useState(initialValue.toString());

  // if parent ever changes initialValue, sync our display
  useEffect(() => {
    setValue(initialValue.toString());
  }, [initialValue]);

  // when focus leaves, validate & notify parent
  const handleBlur = () => {
    const parsed = parseInt(value, 10);
    const caseCount = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setValue(caseCount.toString());
    handleTotalCaseCountChange(caseCount);
  };

  // update our local state, and notify parent immediately if valid
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      handleTotalCaseCountChange(parsed);
    }
  };

  return (
    <div className="total-case-count-box">
      <label htmlFor="quantity">Quantity:</label>
      <TextField
        id="quantity"
        variant="outlined"
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        inputProps={{ min: 1 }}
        sx={{
          mb: 2,
          width: "100px",
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
