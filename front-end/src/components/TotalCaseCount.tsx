import React, { useEffect, useState } from "react";
import "./totalCaseCount.css";
import { TextField } from "@mui/material";

interface TotalCaseCountProps {
  handleTotalCaseCountChange: (caseCount: number) => void;
  initialValue?: number;
  minimum?: number;
  label?: string;
}

const TotalCaseCount: React.FC<TotalCaseCountProps> = ({
  handleTotalCaseCountChange,
  initialValue = 1, // fallback to 1 if undefined
  minimum = 1,
  label = "Quantity",
}) => {
  const [value, setValue] = useState(initialValue.toString());

  // if parent ever changes initialValue, sync our display
  useEffect(() => {
    setValue(initialValue.toString());
  }, [initialValue]);

  // when focus leaves, validate & notify parent
  const handleBlur = () => {
    const parsed = parseInt(value, 10);
    const caseCount = isNaN(parsed) || parsed < minimum ? minimum : parsed;
    setValue(caseCount.toString());
    handleTotalCaseCountChange(caseCount);
  };

  // update our local state, and notify parent immediately if valid
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= minimum) {
      handleTotalCaseCountChange(parsed);
    }
  };

  return (
    <div className="total-case-count-box">
      <label htmlFor="quantity">{label}</label>
      <TextField
        className="total-case-count-input"
        id="quantity"
        variant="outlined"
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        inputProps={{ min: minimum }}
        sx={{
          mb: 2,
          width: "112px",
          "& .MuiInputBase-input": {
            textAlign: "center",
            fontSize: "1.5rem",
            padding: "0.5rem 1.75rem 0.5rem 0.75rem",
          },
        }}
      />
    </div>
  );
};

export default TotalCaseCount;
