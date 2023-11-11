import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../utils/store";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import { setStateFilter, setCityFilter } from "../Slices/locationSlice";


const FilterLocation = () => {
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const { locations } = useSelector((state: RootState) => state.locations);
  const dispatch = useDispatch();

  const handleStateChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedState(event.target.value as string);
    setSelectedCity(""); // Reset city selection when state changes
  };

  const handleCityChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedCity(event.target.value as string);
  };

  const applyLocationFilters = () => {
    // Dispatch the actions to update the state with the selected filters
    dispatch(setStateFilter(selectedState));
    dispatch(setCityFilter(selectedCity));
  };
  return (
    <div>
      <Select value={selectedState} onChange={handleStateChange} displayEmpty>
        <MenuItem value="" disabled>
          Select a State
        </MenuItem>
        {Object.keys(locations).map((state) => (
          <MenuItem key={state} value={state}>
            {state}
          </MenuItem>
        ))}
      </Select>
      {selectedState && (
        <Select value={selectedCity} onChange={handleCityChange} displayEmpty>
          <MenuItem value="" disabled>
            Select a City
          </MenuItem>
          {locations[selectedState]?.map((city) => (
            <MenuItem key={city} value={city}>
              {city}
            </MenuItem>
          ))}
        </Select>
      )}
      <Button
        onClick={applyLocationFilters}
        disabled={!selectedState}
        variant="contained"
        color="primary"
        sx={{
          opacity: !selectedState ? 0.5 : 1,
          cursor: !selectedState ? "not-allowed" : "pointer",
        }}
      >
        Apply Location Filters
      </Button>
    </div>
  );
};

export default FilterLocation;
