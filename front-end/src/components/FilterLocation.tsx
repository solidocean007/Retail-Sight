import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../utils/store";
import {
  setStateFilter,
  setCityFilter,
} from "../Slices/locationSlice";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Chip,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { SelectChangeEvent } from "@mui/material/Select";

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

  const handleStateChange = (event: SelectChangeEvent<typeof selectedStates>) => {
    dispatch(setStateFilter(event.target.value as string[]));
  };

  const handleCityChange = (event: SelectChangeEvent<typeof selectedCities>) => {
    dispatch(setCityFilter(event.target.value as string[]));
  };

  const closeDropdown = (setOpen: (v: boolean) => void) => (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        gap: 2,
        width: "100%",
      }}
    >
      <FormControl fullWidth>
        <InputLabel id="state-multiple-chip-label">State</InputLabel>
        <Select
          className="btn-outline"
          open={stateSelectOpen}
          onOpen={() => setStateSelectOpen(true)}
          onClose={() => setStateSelectOpen(false)}
          labelId="state-multiple-chip-label"
          id="state-multiple-chip"
          multiple
          value={selectedStates}
          onChange={handleStateChange}
          input={<OutlinedInput label="State" />}
          renderValue={(selected) =>
            selected.map((value) => <Chip key={value} label={value} sx={{ mr: 0.5 }} />)
          }
          MenuProps={MenuProps}
          sx={{
            // backgroundColor: "var(--input-background)",
            color: "var(--input-text-color)",
            borderRadius: "var(--card-radius)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, py: 0.5 }}>
            <IconButton size="small" onClick={closeDropdown(setStateSelectOpen)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {Object.keys(locations).map((state) => (
            <MenuItem key={state} value={state}>
              {state}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedStates.length > 0 && (
        <FormControl fullWidth>
          <InputLabel id="city-multiple-chip-label">City</InputLabel>
          <Select
            open={citySelectOpen}
            onOpen={() => setCitySelectOpen(true)}
            onClose={() => setCitySelectOpen(false)}
            labelId="city-multiple-chip-label"
            id="city-multiple-chip"
            multiple
            value={selectedCities}
            onChange={handleCityChange}
            input={<OutlinedInput label="City" />}
            renderValue={(selected) =>
              selected.map((value) => <Chip key={value} label={value} sx={{ mr: 0.5 }} />)
            }
            MenuProps={MenuProps}
            sx={{
              backgroundColor: "var(--input-background)",
              color: "var(--input-text-color)",
              // borderRadius: "var(--card-radius)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "flex-end", px: 1, py: 0.5 }}>
              <IconButton size="small" onClick={closeDropdown(setCitySelectOpen)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
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
    </Box>
  );
};

export default FilterLocation;

