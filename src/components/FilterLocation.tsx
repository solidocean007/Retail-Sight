// FilterLocation
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../utils/store";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { setStateFilter, setCityFilter } from "../Slices/locationSlice";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import { SelectChangeEvent } from "@mui/material/Select";
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

const FilterLocation = () => {
  const { locations, selectedStates, selectedCities } = useSelector((state: RootState) => state.locations);
  const theme = useTheme();  // assigned but never read
  const dispatch = useDispatch<AppDispatch>();

  const handleStateChange = (event: SelectChangeEvent<typeof selectedStates>) => {
    const newStates = event.target.value as string[];
    dispatch(setStateFilter(newStates));
  };

  const handleCityChange = (event: SelectChangeEvent<typeof selectedCities>) => {
    const newCities = event.target.value as string[];
    dispatch(setCityFilter(newCities));
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
          input={<OutlinedInput label="State" />}
          renderValue={(selected) => selected.map(value => <Chip key={value} label={value} />)}
          MenuProps={MenuProps}
        >
          {Object.keys(locations).map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="city-multiple-chip-label">City</InputLabel>
        <Select
          labelId="city-multiple-chip-label"
          id="city-multiple-chip"
          multiple
          value={selectedCities}
          onChange={handleCityChange}
          input={<OutlinedInput label="City" />}
          renderValue={(selected) => selected.map(value => <Chip key={value} label={value} />)}
          MenuProps={MenuProps}
        >
          {selectedStates.flatMap(state => locations[state]?.map(city => (
            <MenuItem key={city} value={city}>
              {city}
            </MenuItem>
          )))}
        </Select>
      </FormControl>
    </div>
  );
};

export default FilterLocation;

