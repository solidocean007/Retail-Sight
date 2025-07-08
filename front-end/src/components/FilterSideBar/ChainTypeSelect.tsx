import React from "react";

interface Props {
  selectedValue: string | null | undefined;
  onSelect: (val: string | null) => void;
}

const ChainTypeSelect: React.FC<Props> = ({ selectedValue, onSelect }) => {
  const options = ["chain", "independent"];

  return (
    <div className="chain-type-select">
      <select
        value={selectedValue || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="dropdown"
        
      >
        
        <option value="">Select Chain Type</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChainTypeSelect;
