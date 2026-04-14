import { Autocomplete, TextField } from "@mui/material";
import { useState } from "react";

interface DistributorOption {
  id: string;
  name: string;
}

interface DistributorAutocompleteProps {
  options: DistributorOption[];
  inputValue: string;
  selectedDistributor: DistributorOption | null;
  onInputChange: (v: string) => void;
  onDistributorChange: (v: DistributorOption | null) => void;
}

const normalize = (str: string) => str.toLowerCase().replace(/[\s\-]+/g, "");

const DistributorAutoComplete: React.FC<DistributorAutocompleteProps> = ({
  options,
  inputValue,
  selectedDistributor,
  onInputChange,
  onDistributorChange,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Autocomplete
      open={open}
      options={options}
      value={selectedDistributor}
      inputValue={inputValue}
      // 🔥 KEY FIX (how MUI displays label)
      getOptionLabel={(option) => option?.name || ""}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      onOpen={() => setOpen(inputValue.length > 0)}
      onClose={(_, reason) => {
        if (
          reason === "blur" ||
          reason === "escape" ||
          reason === "toggleInput"
        ) {
          setOpen(false);
        }
      }}
      onInputChange={(_, v) => {
        onInputChange(v);
        setOpen(v.length > 0);
      }}
      onChange={(_, v) => {
        onDistributorChange(v);
        onInputChange(v?.name ?? "");
        setOpen(false);
      }}
      // 🔥 FIX filtering for object
      filterOptions={(opts, { inputValue: iv }) =>
        opts.filter((opt) => normalize(opt.name).includes(normalize(iv)))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Distributor"
          placeholder="Search distributors"
          onBlur={() => setOpen(false)}
        />
      )}
      fullWidth
      disablePortal
    />
  );
};

export default DistributorAutoComplete;
