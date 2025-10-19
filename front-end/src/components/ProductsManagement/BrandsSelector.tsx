// src/components/ProductsManagement/BrandsSelector.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, Chip, FormControl } from "@mui/material";
import { selectAllProducts } from "../../Slices/productsSlice";
import { useBrandOptions } from "../../hooks/useBrandOptions";
import { useProductTypeOptions } from "../../hooks/useProductTypeOptions";

export interface BrandsSelectorProps {
  selectedBrands: string[];
  selectedProductType: string[]; // matches your PostType.productType[]
  onChange: (brands: string[], productType: string[]) => void;
}

const MAX_BRANDS = 5;

const BrandsSelector: React.FC<BrandsSelectorProps> = ({
  selectedBrands,
  selectedProductType,
  onChange,
}) => {
  const companyProducts = useSelector(selectAllProducts);
  const [brandInput, setBrandInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  // all available brands in the company
  const brandOptions = useBrandOptions();
  const derivedProductTypes = useProductTypeOptions(selectedBrands);

  // If a selected brand has no known types, fallback to empty but let freeSolo input work
  const availableTypes =
    derivedProductTypes.length > 0 ? derivedProductTypes : [];

  // whenever you pick a new set of brands:
  const handleBrandsChange = (_: any, newBrands: string[]) => {
    // 2️⃣ Cap at MAX_BRANDS
    const capped = newBrands.slice(0, MAX_BRANDS);

    // 3️⃣ Build the raw derived list of productTypes for these brands
    const derived = Array.from(
      new Set(
        companyProducts
          .filter((p) => {
            const include = p.brand && capped.includes(p.brand);
            return include;
          })
          .map((p) => {
            const t = p.productType?.toLowerCase() ?? "";
            return t;
          })
          .filter((t) => {
            const keep = Boolean(t);
            if (!keep) console.log("    – filtered out empty type");
            return keep;
          })
      )
    ).sort();

    let defaultTypes: string[];
    const foundBeer = derived.some((t) => {
      const match = t.includes("beer");
      return match;
    });
    const foundWine = derived.some((t) => {
      const match = t.includes("wine");
      return match;
    });

    if (foundBeer) {
      defaultTypes = ["beer pkg"];
    } else if (foundWine) {
      defaultTypes = ["wine unfortified"];
    } else {
      defaultTypes = derived;
    }
    // 5️⃣ Emit the new brands + defaultTypes back to parent
    onChange(capped, defaultTypes);
  };

  // let the user override/tweak the productType list
  const handleTypesChange = (_: any, types: string[]) => {
    onChange(selectedBrands, types);
  };

  return (
    <FormControl fullWidth>
      {/* Brand picker */}
      <Autocomplete
        multiple
        freeSolo
        options={brandOptions}
        value={selectedBrands}
        inputValue={brandInput}
        onInputChange={(_, newInput) => setBrandInput(newInput)}
        onChange={handleBrandsChange}
        getOptionDisabled={(opt) =>
          selectedBrands.length >= MAX_BRANDS && !selectedBrands.includes(opt)
        }
        limitTags={MAX_BRANDS}
        onBlur={() => {
          const trimmed = brandInput.trim();
          if (
            trimmed &&
            !selectedBrands.includes(trimmed) &&
            selectedBrands.length < MAX_BRANDS
          ) {
            handleBrandsChange(null, [...selectedBrands, trimmed]);
          }
          setBrandInput("");
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            const isCustom = !companyProducts.some(
              (p) => p.brand?.toLowerCase() === option.toLowerCase()
            );

            return (
              <Chip
                key={option}
                label={isCustom ? `${option} (Custom)` : option}
                color={isCustom ? "warning" : "default"}
                variant={isCustom ? "outlined" : "filled"}
                {...tagProps}
              />
            );
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Brands"
            placeholder={`Select up to ${MAX_BRANDS}`}
            helperText={
              selectedBrands.length >= MAX_BRANDS
                ? `Max ${MAX_BRANDS} brands`
                : undefined
            }
          />
        )}
      />

      {/* Product‐Type picker */}
      <Autocomplete
        multiple
        freeSolo
        openOnFocus
        autoHighlight
        filterSelectedOptions
        options={availableTypes}
        value={selectedProductType}
        inputValue={typeInput}
        onInputChange={(_, newInput) => setTypeInput(newInput)}
        onChange={handleTypesChange}
        onBlur={() => {
          const trimmed = typeInput.trim();
          if (trimmed && !selectedProductType.includes(trimmed)) {
            handleTypesChange(null, [...selectedProductType, trimmed]);
          }
          setTypeInput("");
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Product Types"
            placeholder="e.g. beer pkg"
          />
        )}
        sx={{ mt: 2 }}
      />
    </FormControl>
  );
};

export default BrandsSelector;
