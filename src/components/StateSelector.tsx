// StateSelector.tsx
import React from 'react';

export type StateType = 'New York' | 'California' | 'Illinois' | 'Texas' | 'Arizona'; // Add more states as needed

const STATES: StateType[] = ['New York', 'California', 'Illinois', 'Texas', 'Arizona'];

interface StateSelectorProps {
  selectedState?: StateType;
  onStateChange: (state: StateType) => void;
}

const StateSelector: React.FC<StateSelectorProps> = ({ selectedState, onStateChange }) => {
  return (
    <select 
      value={selectedState}
      onChange={(e) => onStateChange(e.target.value as StateType)}
    >
      {STATES.map(state => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>
  );
};

export default StateSelector;
