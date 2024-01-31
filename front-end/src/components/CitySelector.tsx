// CitySelector.tsx
import React from 'react';

export type CityType = 'New York' | 'Los Angeles' | 'Chicago' | 'Houston' | 'Phoenix'; // Add more cities as needed

const CITIES: CityType[] = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];

interface CitySelectorProps {
  selectedCity?: CityType;
  onCityChange: (city: CityType) => void;
}

const CitySelector: React.FC<CitySelectorProps> = ({ selectedCity, onCityChange }) => {
  return (
    <select 
      value={selectedCity}
      onChange={(e) => onCityChange(e.target.value as CityType)}
    >
      {CITIES.map(city => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
};

export default CitySelector;
