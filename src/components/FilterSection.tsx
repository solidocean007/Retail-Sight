import React, { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
// import './filterSection.css';

interface FilterSectionProps {
  title: string;
  options: { id: string; name: string }[];
  selected: string[];
  toggleOption: (id: string) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, options, selected, toggleOption }) => {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
      >
        <div className="filter-summary">
          <h3>{title}</h3>
          {selected.length <= 2 ? (
            selected.map((id) => <span key={id}>{options.find((option) => option.id === id)?.name}</span>)
          ) : (
            <span>{selected.slice(0, 2).map((id) => options.find((option) => option.id === id)?.name).join(', ')} and {selected.length - 2} more</span>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div className="filter-options">
          {options.map((option) => (
            <FormControlLabel
              key={option.id}
              control={
                <Checkbox
                  checked={selected.includes(option.id)}
                  onChange={() => toggleOption(option.id)}
                />
              }
              label={option.name}
            />
          ))}
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

export default FilterSection;
