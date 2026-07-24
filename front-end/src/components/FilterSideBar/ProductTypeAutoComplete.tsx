import React, { useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useProductTypeOptions } from "../../hooks/useProductTypeOptions";

interface ProductTypeAutocompleteProps {
  inputValue: string;
  selectedType: string | null;
  onInputChange: (v: string) => void;
  onTypeChange: (v: string | null) => void;
}

const normalize = (str: string) => str.toLowerCase().replace(/[\s-]+/g, "");

const ProductTypeAutocomplete: React.FC<ProductTypeAutocompleteProps> = ({
  inputValue,
  selectedType,
  onInputChange,
  onTypeChange,
}) => {
  const options = useProductTypeOptions();
  const [open, setOpen] = useState<boolean>(false);



  return (
    <Autocomplete
      open={open}
      options={options}
      value={selectedType || ""}
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
      onInputChange={(_, newVal) => {
        onInputChange(newVal);
        setOpen(newVal.length > 0);
      }}
      onChange={(_, newVal) => {
        onTypeChange(newVal);
        onInputChange(newVal || "");
        setOpen(false);
      }}
      
      filterOptions={(opts, { inputValue: iv }) =>
        opts.filter((opt) => normalize(opt).includes(normalize(iv)))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Product Type"
          placeholder="Type to search product types"
          onBlur={() => setOpen(false)}
        />
      )}
      fullWidth
      disablePortal
    />
  );
};

export default ProductTypeAutocomplete;
