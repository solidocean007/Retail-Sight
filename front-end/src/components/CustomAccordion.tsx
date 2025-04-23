// CustomAccordion.tsx
import { useState, useRef } from "react";
import { Checkbox } from "@mui/material";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import "./customAccordion.css";

interface CustomAccordionProps<T extends string> {
  title: string;
  options: T[];
  selected: T[];
  toggleOption: (option: T) => void;
}

const CustomAccordion = <T extends string>({
  title,
  options,
  selected,
  toggleOption,
}: CustomAccordionProps<T>) => {
  const [isActive, setIsActive] = useState(false);

  const toggleAccordion = () => {
    setIsActive(!isActive);
  };

  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef, () => setIsActive(false));

  return (
    <div className="custom-accordion" ref={wrapperRef}>
      <button className="accordion-summary btn-outline" onClick={toggleAccordion}>
      {/* <button className="accordion-summary btn-outline" onClick={toggleAccordion}> */}
        <h3>{title}</h3>
        <h4 style={{ marginLeft: "1rem" }}>
          {selected.length > 0 ? (
            <h4>
              {selected.length} {title}
            </h4>
          ) : null}{" "}
        </h4>
      </button>
      {isActive && (
        <div className={`accordion-details ${isActive ? "open" : ""}`}>
          <div className="button-box">
            <button className="close-button" onClick={() => setIsActive(false)}>
              Close {title}
            </button>
          </div>
          {options.map((option: T) => (
            <div
              className="accordion-option"
              key={option}
              onClick={() => toggleOption(option)}
            >
              <Checkbox
                checked={selected.includes(option)}
                onChange={() => {}}
              />
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomAccordion;
