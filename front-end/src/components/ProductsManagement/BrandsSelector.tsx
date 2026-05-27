// src/components/ProductsManagement/BrandsSelector.tsx
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Autocomplete, TextField, Chip, FormControl } from "@mui/material";
import { useBrandOptions } from "../../hooks/useBrandOptions";
import "./styles/brandsSelector.css";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import { getBrandMatches } from "../../utils/helperFunctions/getBrandMatches";
import CustomConfirmation from "../CustomConfirmation";
import { BRAND_BLACKLIST } from "../../utils/helperFunctions/brandBlackList";
import { useCompanyBrandCatalog } from "../../hooks/useCompanyBrandCatalog";
import { selectUser } from "../../Slices/userSlice";
import { createFilterOptions } from "@mui/material/Autocomplete";

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
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "mm",
    "ml",
    "beer",
    "wine",
    "case",
    "cases",
    "size",
    "pkg",
    "bottle",
    "bottles",
    "can",
    "cans",
    "lager",
    "ipa",
    "ale",
    "brewing",
    "brewery",
    "imports",
    "fl",
    "oz",
    "container",
    "retail",
    "shelf",
    "shelving",
    "packaging and labeling",
    "labeling",
    "convenience store",
  ];

  return !junkWords.includes(w.toLowerCase());
}

export interface BrandsSelectorProps {
  selectedBrands: string[];
  selectedProductType: string[];
  onChange: (
    brands: string[],
    productType: string[],
    brandIds: string[],
  ) => void;
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
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const [hasAppliedAiMatches, setHasAppliedAiMatches] = useState(false);
  const brandOptions = useBrandOptions();

  const {
    getBrandIdByName,
    getProductTypesForBrandNames,
    getSearchTextForBrandOption,
  } = useCompanyBrandCatalog(companyId);

  const derivedProductTypes = getProductTypesForBrandNames(selectedBrands);

  const [brandInput, setBrandInput] = useState("");
  const [typeInput, setTypeInput] = useState("");

  const [aiMatches, setAiMatches] = useState<string[]>([]);
  const [aiCustomSuggestions, setAiCustomSuggestions] = useState<string[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCustomBrand, setPendingCustomBrand] = useState<string | null>(
    null,
  );

  //
  // 1️⃣ OCR → fuzzy matches + potential custom words
  //
  useEffect(() => {
    if (!rawCandidates?.length) return;

    const matches = getBrandMatches(rawCandidates, brandOptions);
    setAiMatches(matches);

    const custom = rawCandidates
      .map((w) => w.trim().toLowerCase())
      .filter((w) => {
        if (!w) return false;
        if (BRAND_BLACKLIST.has(w)) return false;
        if (brandOptions.some((b) => b.toLowerCase() === w)) return false;
        if (matches.some((m) => m.toLowerCase() === w)) return false;
        if (w.length < 3) return false;
        if (/^\d+$/.test(w)) return false;
        return true;
      });

    setAiCustomSuggestions(dedupeBrands(custom));
  }, [rawCandidates, brandOptions]);

  //
  // 2️⃣ Case-insensitive product-type derivation + normalize
  //
  const updateBrands = (list: string[]) => {
    const cleaned = dedupeBrands(list).slice(0, MAX_BRANDS);

    const brandIds = cleaned
      .map((brandName) => getBrandIdByName(brandName))
      .filter((id): id is string => Boolean(id));

    const derived = getProductTypesForBrandNames(cleaned).map((t) =>
      t.toLowerCase(),
    );

    let defaultTypes = ["unspecified"];

    if (derived.some((t) => t.includes("beer"))) {
      defaultTypes = ["beer pkg"];
    } else if (derived.some((t) => t.includes("wine"))) {
      defaultTypes = ["wine unfortified"];
    } else if (derived.length > 0) {
      defaultTypes = derived;
    }

    onChange(cleaned, defaultTypes, brandIds);
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
    // Catalog-only mode:
    // Allow removing/clearing existing selected values.
    // Only keep brands that exist in brandOptions.
    const allowed = new Set(brandOptions.map((b) => b.toLowerCase()));

    const catalogOnly = newList.filter((brand) =>
      allowed.has(brand.toLowerCase()),
    );

    updateBrands(catalogOnly);
  };

  //
  // 5️⃣ Product Types
  //
  const handleTypesChange = (_: any, types: string[]) => {
    const brandIds = selectedBrands
      .map((brandName) => getBrandIdByName(brandName))
      .filter((id): id is string => Boolean(id));

    onChange(selectedBrands, types, brandIds);
  };
  //
  // 6️⃣ Auto-select AI fuzzy matches (your corrected behavior)
  //
  useEffect(() => {
    if (hasAppliedAiMatches) return;
    if (aiMatches.length === 0) return;
    if (selectedBrands.length > 0) return;

    updateBrands(aiMatches);

    setHasAppliedAiMatches(true);

    dispatch(
      showMessage(
        aiMatches.length === 1
          ? `🤖 Auto-added AI match: ${aiMatches[0]}`
          : `🤖 Auto-added ${aiMatches.length} detected brands`,
      ),
    );
  }, [aiMatches, hasAppliedAiMatches, selectedBrands.length, dispatch]);

  useEffect(() => {
    setHasAppliedAiMatches(false);
  }, [rawCandidates]);

  //
  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  //

  const filterBrandOptions = createFilterOptions<string>({
    stringify: (option) => getSearchTextForBrandOption(option),
  });

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

            {/* {aiCustomSuggestions.length > 0 && (
              <>
                <p className="ai-subtitle">Possible new brands:</p>
                <div className="ai-chip-row">
                  {aiCustomSuggestions.slice(0, 8).map((word) => (
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
            )} */}

            {aiMatches.length === 0 && aiCustomSuggestions.length === 0 && (
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
          // freeSolo
          options={brandOptions}
          filterOptions={filterBrandOptions}
          value={selectedBrands}
          inputValue={brandInput}
          onInputChange={(_, v) => setBrandInput(v)}
          onChange={handleBrandsChange}
          getOptionDisabled={(opt) =>
            selectedBrands.length >= MAX_BRANDS && !selectedBrands.includes(opt)
          }
          limitTags={MAX_BRANDS}
          onBlur={() => {
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
