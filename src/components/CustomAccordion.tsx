// CustomAccordion.tsx
import React, { useState } from "react";
import { Checkbox } from "@mui/material";
import "./customAccordion.css";

interface CustomAccordionProps {
  title: string;
  options: { id: string; name: string }[];
  selected: string[];
  toggleOption: (id: string) => void;
}

const CustomAccordion: React.FC<CustomAccordionProps> = ({
  title,
  options,
  selected,
  toggleOption,
}) => {
  const [isActive, setIsActive] = useState(false);

  const toggleAccordion = () => {
    setIsActive(!isActive);
  };

  return (
    <div className="custom-accordion">
      <div className="accordion-summary" onClick={toggleAccordion}>
        <h3>{title}</h3>
        {selected.length <= 2 ? (
          selected.map((id) => (
            <span key={id}>
              {options.find((option) => option.id === id)?.name}{" "}
            </span>
          ))
        ) : (
          <span>
            {selected
              .slice(0, 2)
              .map((id) => options.find((option) => option.id === id)?.name)
              .join(", ")}{" "}
            and {selected.length - 2} more
          </span>
        )}
      </div>
      {isActive && (
        <div className={`accordion-details ${isActive ? "open" : ""}`}>
           <button className="close-button" onClick={() => setIsActive(false)}>X</button>
          {options.map((option) => (
            <div key={option.id} onClick={() => toggleOption(option.id)}>
              <Checkbox
                checked={selected.includes(option.id)}
                onChange={() => {}} // Empty function since click on div handles it
              />
              {option.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomAccordion;
