import React, { useEffect, useState } from 'react';
import './totalCaseCount.css';

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
    const caseCount = isNaN(parsed) ? 0 : parsed;
    setValue(caseCount);
  };

  return (
    <div className="total-case-count-box">
      <label htmlFor="quantity">Quantity:</label>
      <input
        id="quantity"
        type="number"
        min="1"
        value={value}
        onChange={handleChange}
        style={{
          textAlign: "center",
          fontSize: "1.5rem",
          padding: "0.5rem 1rem",
          width: "100px",
        }}
      />
    </div>
  );
};

export default TotalCaseCount;

