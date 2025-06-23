import React, { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { useProductTypeOptions } from "../../hooks/useProductTypeOptions";
import { on } from "events";

interface ProductTypeAutocompleteProps {
  inputValue: string;
  selectedType: string | null;
  onInputChange: (v: string) => void;
  onTypeChange: (v: string | null) => void;
}

const normalize = (str: string) => str.toLowerCase().replace(/[\s\-]+/g, "");

const ProductTypeAutocomplete: React.FC<ProductTypeAutocompleteProps> = ({
  inputValue,
  selectedType,
  onInputChange,
  onTypeChange,
}) => {
  const options = useProductTypeOptions();
  const [open, setOpen] = useState<boolean>(false);

  // useEffect(() => {
  //   setInputValue(selectedType || '');
  //   setOpen(false);
  // }, [selectedType]);

  return (
    <Autocomplete
      open={open}
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
      options={options}
      value={selectedType || ""}
      inputValue={inputValue}
      onInputChange={(_, newVal) => {
        onInputChange(newVal);
      }}
      // onInputChange={(v, newInput, reason) => {
      //   onInputChange(v);
      //   setInputValue(newInput);
      //   if (reason === "input") {
      //     setOpen(newInput.length > 0);
      //   }
      //   // auto-select exact matches
      //   const exact = options.find(
      //     (opt) => normalize(opt) === normalize(newInput)
      //   );
      //   onTypeChange(exact || null);
      // }}
       onChange={(_, newVal) => {
        onTypeChange(newVal)
        onInputChange(newVal || "")
      }}
      // onChange={(_, newValue) => {
      //   onTypeChange(newValue);
      //   setInputValue(newValue || "");
      //   setOpen(false);
      // }}
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
