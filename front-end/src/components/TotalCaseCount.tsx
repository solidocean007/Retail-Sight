// TotalCaseCount.tsx
import React from 'react';
import './totalCaseCount.css'

interface TotalCaseCountProps {
  handleTotalCaseCountChange: (caseCount: number) => void;
}

const TotalCaseCount: React.FC<TotalCaseCountProps> = ({ handleTotalCaseCountChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert input value to number and pass it to the handler
    const caseCount = parseInt(e.target.value, 10) || 0;
    handleTotalCaseCountChange(caseCount);
  };

  return (
    <div className="total-case-count-box">
      <label htmlFor="quantity">Quantity:</label>
      <input id='quantity' type="number" onChange={handleChange} min='1' />
    </div>
  );
};

export default TotalCaseCount;
