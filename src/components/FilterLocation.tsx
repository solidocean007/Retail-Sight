// import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../utils/store";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
// import Button from "@mui/material/Button";
import { setStateFilter, setCityFilter } from "../Slices/locationSlice";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Chip from "@mui/material/Chip";
import { Theme, useTheme } from "@mui/material/styles";
import "./filter-location.css";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(name: string, selected: string[], theme: Theme) {
  // arguments need types
  return {
    fontWeight:
      selected.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

interface FilterLocationProps {
  selectedStates: string[];
  setSelectedStates: React.Dispatch<React.SetStateAction<never[]>>;
  selectedCities: string[];
  setSelectedCities: React.Dispatch<React.SetStateAction<never[]>>;
}

const FilterLocation: React.FC<FilterLocationProps> = ({
  selectedStates,
  setSelectedStates,
  selectedCities,
  setSelectedCities,
}) => {
  const { locations } = useSelector((state: RootState) => state.locations);
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const handleStateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newStates = event.target.value as string[];
    setSelectedStates(newStates);
    dispatch(setStateFilter(newStates)); // Dispatch the action to update the Redux store
    setSelectedCities([]); // Reset cities when states change
  };

  const handleCityChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newCities = event.target.value as string[];
    setSelectedCities(newCities);
    dispatch(setCityFilter(newCities)); // Dispatch the action to update the Redux store
  };

  return (
    <div>
      <FormControl fullWidth>
        <InputLabel id="state-multiple-chip-label">State</InputLabel>
        <Select
          className="location-input"
          labelId="state-multiple-chip-label"
          id="state-multiple-chip"
          multiple
          value={selectedStates}
          onChange={handleStateChange}
          input={<OutlinedInput id="select-multiple-chip" label="State" />}
          renderValue={(selected) => (
            <div>
              {selected.map((value) => (
                <Chip key={value} label={value} />
              ))}
            </div>
          )}
          MenuProps={MenuProps}
        >
          {Object.keys(locations).map((state) => (
            <MenuItem
              key={state}
              value={state}
              style={getStyles(state, selectedStates, theme)}
            >
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedStates.length > 0 && (
        <FormControl fullWidth>
          <InputLabel id="city-multiple-chip-label">City</InputLabel>
          <Select
            className="location-input"
            labelId="city-multiple-chip-label"
            id="city-multiple-chip"
            multiple
            value={selectedCities}
            onChange={handleCityChange}
            input={<OutlinedInput id="select-multiple-chip" label="City" />}
            renderValue={(selected) => (
              <div>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </div>
            )}
            MenuProps={MenuProps}
          >
            {selectedStates.flatMap((state) =>
              locations[state]?.map((city) => (
                <MenuItem
                  key={city}
                  value={city}
                  style={getStyles(city, selectedCities, theme)}
                >
                  {city}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}
    </div>
  );
};

export default FilterLocation;
