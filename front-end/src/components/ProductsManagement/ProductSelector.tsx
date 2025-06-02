// components/ProductSelector.tsx
import React, { useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { TextField, Checkbox, Box, Typography } from "@mui/material";
import "./styles/productSelector.css";
import { ProductType } from "../../utils/types";
import { useDebouncedValue } from "../../hooks/useDebounce";

interface ProductSelectorProps {
  availableProducts: ProductType[];
  selectedProducts: ProductType[];
  onSelect: (products: ProductType[]) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  availableProducts,
  selectedProducts,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const filteredProducts = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();
    return availableProducts
      .filter(
        (p) =>
          p.productName?.toLowerCase().includes(lower) ||
          p.brand?.toLowerCase().includes(lower) ||
          p.brandFamily?.toLowerCase().includes(lower) ||
          p.supplierProductNumber?.toLowerCase().includes(lower)
      )
      .sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
  }, [availableProducts, debouncedSearch]);

  const handleToggle = (product: ProductType) => {
    const exists = selectedProducts.some(
      (p) => p.companyProductId === product.companyProductId
    );
    if (exists) {
      onSelect(
        selectedProducts.filter(
          (p) => p.companyProductId !== product.companyProductId
        )
      );
    } else {
      onSelect([...selectedProducts, product]);
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = filteredProducts[index];
    const isChecked = selectedProducts.some(
      (p) => p.companyProductId === product.companyProductId
    );

    return (
      <div
        style={style}
        className="product-row"
        onClick={() => handleToggle(product)}
      >
        <Checkbox checked={isChecked} tabIndex={-1} disableRipple />
        <div className="product-info">
          <strong>{product.productName}</strong>
          <div className="product-sub">
            {product.brand} | {product.package} | {product.brandFamily}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Box className="product-selector">
      <Typography variant="h6">Select Products</Typography>
      <TextField
        fullWidth
        variant="outlined"
        label="Search by name, brand, or supplier#"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        sx={{ mb: 2 }}
      />

      {isFocused || searchTerm.trim() !== "" ? (
        <List
          height={200}
          itemCount={filteredProducts.length}
          itemSize={72}
          width="100%"
        >
          {Row}
        </List>
      ) : null}
    </Box>
  );
};

export default ProductSelector;

