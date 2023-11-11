import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../utils/store";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { setStateFilter, setCityFilter } from "../Slices/locationSlice";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Chip from '@mui/material/Chip';
import { Theme, useTheme } from '@mui/material/styles';

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

function getStyles(name: string, selected: string[], theme: Theme) { // arguments need types
  return {
    fontWeight:
      selected.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}


const FilterLocation = () => {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const { locations } = useSelector((state: RootState) => state.locations);
  const dispatch = useDispatch();
  const theme = useTheme();


  const handleStateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedStates(event.target.value as string[]);
    setSelectedCities([]); // Reset cities when states change
  };

  const handleCityChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedCities(event.target.value as string[]);
  };

  const applyLocationFilters = () => {
    dispatch(setStateFilter(selectedStates));
    dispatch(setCityFilter(selectedCities));
  };

  return (
    <div>
      <FormControl fullWidth>
      <InputLabel id="state-multiple-chip-label">State</InputLabel> 
        <Select
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
              style={getStyles(state, selectedStates, theme)} // cannot find name them
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
                  style={getStyles(city, selectedCities, theme)} // cannot find name them
                >
                  {city}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      )}
      <Button
        onClick={applyLocationFilters}
        disabled={!selectedStates.length}
        variant="contained"
        color="primary"
      >
        Apply Location Filters
      </Button>
    </div>
  );
};

export default FilterLocation;
