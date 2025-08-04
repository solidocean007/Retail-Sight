// components/forms/FilterMultiSelect.tsx
import React from "react";
import {
  Autocomplete,
  Checkbox,
  TextField,
  SxProps,
  Theme,
} from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

interface FilterMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search...",
  sx,
}) => {
  const sortedOptions = [...options].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={sortedOptions}
      value={selected}
      onChange={(_, newValue) => onChange(newValue)}
      filterSelectedOptions
      getOptionLabel={(option) => option}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 8 }}
            checked={selected}
          />
          {option}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size="small"
          InputProps={{
            ...params.InputProps,
            startAdornment: null,
          }}
        />
      )}
      sx={sx || { minWidth: 200 }}
    />
  );
};

export default FilterMultiSelect;

