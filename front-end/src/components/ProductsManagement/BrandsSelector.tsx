import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, Chip } from "@mui/material";
import { selectAllProducts } from "../../Slices/productsSlice";

interface BrandsSelectorProps {
  selectedBrands: string[];
  onChange: (brands: string[]) => void;
}

const MAX_BRANDS = 4;

const BrandsSelector: React.FC<BrandsSelectorProps> = ({
  selectedBrands,
  onChange,
}) => {
  // Derive unique, sorted list of brands from products in Redux
  const products = useSelector(selectAllProducts);
  const brandOptions = useMemo(() => {
    const brands = products
      .map((p) => p.brand)
      .filter((b): b is string => Boolean(b));
    return Array.from(new Set(brands)).sort();
  }, [products]);

  // Enforce max‐4 selections
  const handleChange = (_: any, value: string[]) => {
    if (value.length <= MAX_BRANDS) {
      onChange(value);
    }
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      options={brandOptions}
      value={selectedBrands}
      onChange={handleChange}
      getOptionDisabled={(option) =>
        selectedBrands.length >= MAX_BRANDS && !selectedBrands.includes(option)
      }
      limitTags={MAX_BRANDS}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const tagProps = getTagProps({ index });
          const { key, ...other } = tagProps; // remove key
          return (
            <Chip
              key={option}
              label={option}
              {...other}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          label="Brands"
          placeholder="Select or type up to 4"
          helperText={
            selectedBrands.length >= MAX_BRANDS
              ? `Maximum of ${MAX_BRANDS} brands allowed`
              : ""
          }
        />
      )}
      sx={{ width: 300, my: 1 }}
    />
  );
};

export default BrandsSelector;
