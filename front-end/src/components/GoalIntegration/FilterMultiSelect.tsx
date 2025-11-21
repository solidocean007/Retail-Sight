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

export interface OptionItem {
  label: string;
  value: string;
}

interface FilterMultiSelectProps {
  label: string;
  options: OptionItem[];
  selectedValues: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = "Search...",
  sx,
}) => {
  const selectedObjects = options.filter((o) =>
    selectedValues.includes(o.value)
  );

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      options={options}
      value={selectedObjects}
      onChange={(_, newValue) => {
        onChange(newValue.map((o) => o.value));
      }}
      getOptionLabel={(option) => option.label}
      filterSelectedOptions
      renderOption={(props, option, { selected }) => {
        const opt =
          typeof option === "string"
            ? { label: option, value: option }
            : option;
        return (
          <li {...props}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {opt.label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size="small"
        />
      )}
      sx={sx || { minWidth: 200 }}
    />
  );
};

export default FilterMultiSelect;
