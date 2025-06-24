import { Autocomplete, TextField } from "@mui/material";
import { useBrandOptions } from "../../hooks/useBrandOptions";
import { useState } from "react";

interface BrandAutocompleteProps {
  inputValue: string;
  selectedBrand: string | null;
  onInputChange: (v: string) => void;
  onBrandChange: (v: string | null) => void;
}

const normalize = (str: string) => str.toLowerCase().replace(/[\s\-]+/g, "");

const BrandAutoComplete: React.FC<BrandAutocompleteProps> = ({
  inputValue,
  selectedBrand,
  onInputChange,
  onBrandChange,
}) => {
  const brandOptions = useBrandOptions();
  const [open, setOpen] = useState<boolean>(false);

  return (
    <Autocomplete
      open={open}
      options={brandOptions}
      value={selectedBrand || ""}
      inputValue={inputValue}
      onOpen={() => setOpen(inputValue.length > 0)}
      onClose={(_, reason) => {
        // close on blur, escape key, or when input toggles
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
        onBrandChange(v);
        onInputChange(v ?? "");
        setOpen(false);
      }}
      // onClose={() => setOpen(false)}
      // onInputChange={(_, newVal) => {
      //   onInputChange(newVal);
      // }}
      // onChange={(_, newVal) => {
      //   onTypeChange(newVal);
      //   onInputChange(newVal || "");
      // }}
      filterOptions={(opts, { inputValue: iv }) =>
        opts.filter((opt) => normalize(opt).includes(normalize(iv)))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Brand"
          placeholder="Type to search brands"
          onBlur={() => setOpen(false)}
        />
      )}
      fullWidth
      disablePortal
    />
  );
};

export default BrandAutoComplete;
