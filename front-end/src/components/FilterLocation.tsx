// FilterLocation
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../utils/store";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { setStateFilter, setCityFilter } from "../Slices/locationSlice";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import Chip from "@mui/material/Chip";
// import { useTheme } from "@mui/material/styles";
import { SelectChangeEvent } from "@mui/material/Select";
import "./filterLocation.css";

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
  const [stateSelectOpen, setStateSelectOpen] = useState(false);
  const [citySelectOpen, setCitySelectOpen] = useState(false);
  const { locations, selectedStates, selectedCities } = useSelector(
    (state: RootState) => state.locations
  );
  const dispatch = useDispatch<AppDispatch>();

  const handleStateChange = (
    event: SelectChangeEvent<typeof selectedStates>
  ) => {
    const newStates = event.target.value as string[];
    dispatch(setStateFilter(newStates));
  };

  const handleCityChange = (
    event: SelectChangeEvent<typeof selectedCities>
  ) => {
    const newCities = event.target.value as string[];
    dispatch(setCityFilter(newCities));
  };

  const handleClose = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevents triggering the onChange of Select
    setStateSelectOpen(false);
  };

  return (
    <div className="location-selection-container">
      <FormControl className="filter-box">
        <InputLabel id="state-multiple-chip-label">State</InputLabel>
        <Select
          open={stateSelectOpen}
          onOpen={() => setStateSelectOpen(true)}
          onClose={() => setStateSelectOpen(false)}
          className="btn"
          labelId="state-multiple-chip-label"
          id="state-multiple-chip"
          multiple
          value={selectedStates}
          onChange={handleStateChange}
          input={<OutlinedInput label="State" />}
          renderValue={(selected) =>
            selected.map((value) => <Chip key={value} label={value} />)
          }
          MenuProps={MenuProps}
        >
          <div className="close-box">
            <button className="close-button" onClick={handleClose}>
              X
            </button>
          </div>
          {Object.keys(locations).map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedStates.length > 0 && (
        <FormControl className="filter-box">
          <InputLabel id="city-multiple-chip-label">City</InputLabel>
          <Select
            open={citySelectOpen}
            onOpen={() => setCitySelectOpen(true)}
            onClose={() => setCitySelectOpen(false)}
            className="btn"
            labelId="city-multiple-chip-label"
            id="city-multiple-chip"
            multiple
            value={selectedCities}
            onChange={handleCityChange}
            input={<OutlinedInput label="City" />}
            renderValue={(selected) =>
              selected.map((value) => <Chip key={value} label={value} />)
            }
            MenuProps={MenuProps}
          >
            <div className="close-box">
              <button
                className="close-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setCitySelectOpen(false);
                }}
              >
                X
              </button>
            </div>
            {selectedStates.flatMap((state) =>
              locations[state]?.map((city) => (
                <MenuItem key={city} value={city}>
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
