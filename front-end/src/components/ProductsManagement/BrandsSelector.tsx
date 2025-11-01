// src/components/ProductsManagement/BrandsSelector.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, Chip, FormControl } from "@mui/material";
import { selectAllProducts } from "../../Slices/productsSlice";
import { useBrandOptions } from "../../hooks/useBrandOptions";
import { useProductTypeOptions } from "../../hooks/useProductTypeOptions";
import "./styles/brandsSelector.css";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { getBrandMatches } from "../../utils/helperFunctions/getBrandMatches";

export interface BrandsSelectorProps {
  selectedBrands: string[];
  selectedProductType: string[]; // matches your PostType.productType[]
  onChange: (brands: string[], productType: string[]) => void;
  // 🧠 Optional props for AI detection
  autoDetectedBrands?: string[];
  rawCandidates?: string[];
}

const MAX_BRANDS = 5;

const BrandsSelector: React.FC<BrandsSelectorProps> = ({
  selectedBrands,
  selectedProductType,
  onChange,
  autoDetectedBrands,
  rawCandidates,
}) => {
  const dispatch = useAppDispatch();
  const companyProducts = useSelector(selectAllProducts);
  const [brandInput, setBrandInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  // all available brands in the company
  const brandOptions = useBrandOptions(); // your company brand list
  const [aiMatches, setAiMatches] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const derivedProductTypes = useProductTypeOptions(selectedBrands);

  // If a selected brand has no known types, fallback to empty but let freeSolo input work
  const availableTypes =
    derivedProductTypes.length > 0 ? derivedProductTypes : [];

  // 🔍 Compare AI rawCandidates to known brands whenever they update
  useEffect(() => {
    if (!rawCandidates?.length) return;

    const matches = getBrandMatches(rawCandidates, brandOptions);
    setAiMatches(matches);

    // pick the top 10 candidates for display
    const top10 = Array.from(new Set(rawCandidates)).slice(0, 10);

    setAiMatches(matches);
    setAiSuggestions(top10);
  }, [rawCandidates, brandOptions]);

  // 🧠 When AI finds matches, auto-add them to selected brands
  useEffect(() => {
    if (aiMatches.length === 0) return;

    // Case-insensitive deduplication
    const normalizedSelected = selectedBrands.map((b) => b.toLowerCase());
    const newMatches = aiMatches.filter(
      (m) => !normalizedSelected.includes(m.toLowerCase())
    );

    if (newMatches.length === 0) return;

    // Cap total to MAX_BRANDS
    const combined = [...selectedBrands, ...newMatches].slice(0, MAX_BRANDS);

    onChange(combined, selectedProductType);

    // Snackbar feedback
    const msg =
      newMatches.length === 1
        ? `✅ Added AI-detected brand: ${newMatches[0]}`
        : `✅ Added ${newMatches.length} AI-detected brands`;
    dispatch(showMessage(msg));

    // optional: add highlight pulse effect
    const brandBox = document.querySelector(".brandsSelector");
    if (brandBox) {
      brandBox.classList.add("ai-brand-pulse");
      setTimeout(() => brandBox.classList.remove("ai-brand-pulse"), 1500);
    }
  }, [aiMatches]);

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
    <div className="brandsSelector">
      <div className="ui-detect-brands">
        {rawCandidates && rawCandidates.length > 0 ? (
          <div className="ai-suggestions-box">
            <h4>🧠 Beta AI Brand Detection</h4>

            <p className="ai-subtitle">Top suggestions:</p>
            <div className="ai-chip-row">
              {aiSuggestions.map((word) => (
                <Chip key={word} label={word} size="small" variant="outlined" />
              ))}
            </div>

            {aiMatches.length > 0 ? (
              <>
                <p className="ai-subtitle">Matched company brands:</p>
                <div className="ai-chip-row">
                  {aiMatches.map((brand) => (
                    <Chip
                      key={brand}
                      label={brand}
                      color="success"
                      variant="filled"
                      size="small"
                      onClick={() =>
                        handleBrandsChange(null, [...selectedBrands, brand])
                      }
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="ai-subtitle-muted">No exact matches found</p>
            )}
          </div>
        ) : (
          <p className="ai-subtitle-muted">
            AI detection pending or unavailable
          </p>
        )}
      </div>

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
    </div>
  );
};

export default BrandsSelector;
