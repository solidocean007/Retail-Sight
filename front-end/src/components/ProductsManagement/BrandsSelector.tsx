// src/components/ProductsManagement/BrandsSelector.tsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, Chip, FormControl } from "@mui/material";
import { selectAllProducts } from "../../Slices/productsSlice";
import { useBrandOptions } from "../../hooks/useBrandOptions";
import { useProductTypeOptions } from "../../hooks/useProductTypeOptions";
import "./styles/brandsSelector.css";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { getBrandMatches } from "../../utils/helperFunctions/getBrandMatches";
import CustomConfirmation from "../CustomConfirmation";

//
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
//

// Case-insensitive dedupe
const dedupeBrands = (brands: string[]) => {
  const map = new Map<string, string>();
  for (const b of brands) {
    const key = b.trim().toLowerCase();
    if (!map.has(key)) map.set(key, b.trim());
  }
  return [...map.values()];
};

// Validate whether a custom brand is reasonable
function isValidCustomBrand(word: string): boolean {
  if (!word) return false;
  const w = word.trim();
  if (w.length < 3) return false;
  if (/^\d+$/.test(w)) return false;

  const junkWords = [
    "the","and","for","with","from","this","that",
    "mm","ml","beer","wine","case","cases","size","pkg",
    "bottle","bottles","can","cans","lager","ipa","ale",
    "brewing","brewery","imports","fl","oz","container",
  ];

  return !junkWords.includes(w.toLowerCase());
}

export interface BrandsSelectorProps {
  selectedBrands: string[];
  selectedProductType: string[];
  onChange: (brands: string[], productType: string[]) => void;
  rawCandidates?: string[];
}

const MAX_BRANDS = 5;

//
// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────
//

const BrandsSelector: React.FC<BrandsSelectorProps> = ({
  selectedBrands,
  selectedProductType,
  onChange,
  rawCandidates,
}) => {
  const dispatch = useAppDispatch();
  const companyProducts = useSelector(selectAllProducts);

  const brandOptions = useBrandOptions();
  const derivedProductTypes = useProductTypeOptions(selectedBrands);

  const [brandInput, setBrandInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  const [aiMatches, setAiMatches] = useState<string[]>([]);
  const [aiCustomSuggestions, setAiCustomSuggestions] = useState<string[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCustomBrand, setPendingCustomBrand] = useState<string | null>(
    null
  );

  //
  // 1️⃣ OCR → fuzzy matches + potential custom words
  //
  useEffect(() => {
    if (!rawCandidates?.length) return;

    const matches = getBrandMatches(rawCandidates, brandOptions);
    setAiMatches(matches);

    // Extract possible custom brands
    const custom = rawCandidates
      .map((w) => w.trim())
      .filter((w) => {
        if (!w) return false;
        const lower = w.toLowerCase();
        if (brandOptions.some((b) => b.toLowerCase() === lower)) return false;
        if (matches.some((m) => m.toLowerCase() === lower)) return false;
        if (lower.length < 3) return false;
        if (/^\d+$/.test(lower)) return false;
        return true;
      });

    setAiCustomSuggestions(dedupeBrands(custom));
  }, [rawCandidates, brandOptions]);

  //
  // 2️⃣ Case-insensitive product-type derivation + normalize
  //
  const updateBrands = (list: string[]) => {
    const cleaned = dedupeBrands(list).slice(0, MAX_BRANDS);

    const cleanedLower = cleaned.map((b) => b.toLowerCase());

    const derived = Array.from(
      new Set(
        companyProducts
          .filter(
            (p) => p.brand && cleanedLower.includes(p.brand.toLowerCase())
          )
          .map((p) => p.productType?.toLowerCase() ?? "")
          .filter(Boolean)
      )
    ).sort();

    let defaultTypes = ["unspecified"];
    if (derived.some((t) => t.includes("beer"))) defaultTypes = ["beer pkg"];
    else if (derived.some((t) => t.includes("wine")))
      defaultTypes = ["wine unfortified"];
    else if (derived.length > 0) defaultTypes = derived;

    onChange(cleaned, defaultTypes);
  };

  //
  // 3️⃣ Confirm modal for custom brand
  //
  const requestAddCustomBrand = (word: string) => {
    setPendingCustomBrand(word);
    setConfirmOpen(true);
  };

  const confirmAddCustomBrand = () => {
    if (!pendingCustomBrand) return;
    updateBrands([...selectedBrands, pendingCustomBrand]);
    dispatch(showMessage(`➕ Added custom brand: ${pendingCustomBrand}`));

    setPendingCustomBrand(null);
    setConfirmOpen(false);
  };

  //
  // 4️⃣ Manual brand selection
  //
  const handleBrandsChange = (_: any, newList: string[]) => {
    const newItem = newList[newList.length - 1];

    const lowerKnown = brandOptions.map((b) => b.toLowerCase());
    const isKnown = lowerKnown.includes(newItem?.toLowerCase());

    if (!isKnown) {
      if (newItem && isValidCustomBrand(newItem)) {
        requestAddCustomBrand(newItem);
        return;
      }
    }

    updateBrands(newList);
  };

  //
  // 5️⃣ Product Types
  //
  const handleTypesChange = (_: any, types: string[]) => {
    onChange(selectedBrands, types);
  };

  //
  // 6️⃣ Auto-select AI fuzzy matches (your corrected behavior)
  //
  useEffect(() => {
    if (aiMatches.length === 0) return;

    const lowerSelected = selectedBrands.map((b) => b.toLowerCase());

    const newOnes = aiMatches.filter(
      (m) => !lowerSelected.includes(m.toLowerCase())
    );

    if (newOnes.length > 0) {
      updateBrands([...selectedBrands, ...newOnes]);
      dispatch(
        showMessage(
          newOnes.length === 1
            ? `🤖 Auto-added AI match: ${newOnes[0]}`
            : `🤖 Auto-added ${newOnes.length} detected brands`
        )
      );
    }
  }, [aiMatches]);

  //
  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  //

  return (
    <div className="brandsSelector">
      <div className="ui-detect-brands">
        {rawCandidates?.length ? (
          <div className="ai-suggestions-box">
            <h4>🧠 Beta AI Brand Detection</h4>

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
              <p className="ai-subtitle-muted">
                No matching brands detected. Select manually below.
              </p>
            )}

            {aiCustomSuggestions.length > 0 && (
              <>
                <p className="ai-subtitle">Possible new brands:</p>
                <div className="ai-chip-row">
                  {aiCustomSuggestions.map((word) => (
                    <Chip
                      key={word}
                      label={`${word} (Custom)`}
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => requestAddCustomBrand(word)}
                    />
                  ))}
                </div>
              </>
            )}

            {aiMatches.length === 0 &&
              aiCustomSuggestions.length === 0 && (
                <p className="ai-subtitle-muted">
                  No recognizable brands detected.
                </p>
              )}
          </div>
        ) : (
          <p className="ai-subtitle-muted">AI detection pending...</p>
        )}
      </div>

      <FormControl fullWidth>
        {/* BRAND PICKER */}
        <Autocomplete
          multiple
          freeSolo
          options={brandOptions}
          value={selectedBrands}
          inputValue={brandInput}
          onInputChange={(_, v) => setBrandInput(v)}
          onChange={handleBrandsChange}
          getOptionDisabled={(opt) =>
            selectedBrands.length >= MAX_BRANDS && !selectedBrands.includes(opt)
          }
          limitTags={MAX_BRANDS}
          onBlur={() => {
            const trimmed = brandInput.trim();
            if (trimmed) requestAddCustomBrand(trimmed);
            setBrandInput("");
          }}
          renderInput={(params) => (
            <TextField {...params} label="Brands" placeholder="Select brand" />
          )}
        />

        {/* PRODUCT TYPES */}
        <Autocomplete
          multiple
          freeSolo
          autoHighlight
          options={derivedProductTypes}
          value={selectedProductType}
          inputValue={typeInput}
          onInputChange={(_, v) => setTypeInput(v)}
          onChange={handleTypesChange}
          onBlur={() => {
            const trimmed = typeInput.trim();
            if (trimmed && !selectedProductType.includes(trimmed)) {
              handleTypesChange(null, [...selectedProductType, trimmed]);
            }
            setTypeInput("");
          }}
          sx={{ mt: 2 }}
          renderInput={(params) => (
            <TextField {...params} label="Product Types" />
          )}
        />
      </FormControl>

      {/* CONFIRM CUSTOM BRAND MODAL */}
      <CustomConfirmation
        isOpen={confirmOpen}
        title="Add Custom Brand?"
        message={
          pendingCustomBrand
            ? `“${pendingCustomBrand}” is not a recognized company brand. Add it anyway?`
            : ""
        }
        onConfirm={confirmAddCustomBrand}
        onClose={() => {
          setConfirmOpen(false);
          setPendingCustomBrand(null);
        }}
      />
    </div>
  );
};

export default BrandsSelector;
