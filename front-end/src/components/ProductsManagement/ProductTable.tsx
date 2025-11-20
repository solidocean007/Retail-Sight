// ProductTable.tsx
import React, { useState } from "react";
import {
  Button,
  FormControl,
  InputLabel,
  OutlinedInput,
  Box,
  useMediaQuery,
} from "@mui/material";
import { FixedSizeList as List } from "react-window";
import { ProductType } from "../../utils/types";
import "./styles/productTable.css";
import MobileProductCard from "./MobileProductCard";
import ProductEditorModal from "./ProductEditModal";

interface ProductTableProps {
  products: ProductType[];
  height?: number;
  // rowHeight?: number;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onEditSave: (updated: ProductType) => Promise<void> | void;
  onDelete: (productId: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  height = 500,
  // rowHeight = 60,
  searchTerm = "",
  setSearchTerm = () => {},
  onEditSave,
  onDelete,
}) => {
  const isMobile = useMediaQuery("(max-width:1200px)");
  const [editorOpen, setEditorOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductType | null>(null);

  const openEditor = (p: ProductType) => {
    setProductToEdit(p);
    setEditorOpen(true);
  };

  const handleSave = async (p: ProductType) => {
    await onEditSave(p);
    setEditorOpen(false);
    setProductToEdit(null);
  };

  const filteredProducts = products.filter((p) =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rowHeight = isMobile ? 360 : 60;

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const product = filteredProducts[index];

    if (isMobile) {
      return (
        <MobileProductCard
          product={product}
          style={style}
          onEdit={() => openEditor(product)}
          onDelete={() => onDelete(product.companyProductId)}
        />
      );
    }

    return (
      <Box style={style} className="product-row">
        <div className="product-cell product-column-id">
          {product.companyProductId}
        </div>
        <div className="product-cell product-column-name">
          {product.productName}
        </div>
        <div className="product-cell product-column-package">
          {product.package}
        </div>
        <div className="product-cell product-column-brand">{product.brand}</div>
        <div className="product-cell product-column-family">
          {product.brandFamily}
        </div>
        <div className="product-cell product-column-supplier">
          {product.productSupplier}
        </div>
        <div className="product-cell product-column-number">
          {product.supplierProductNumber}
        </div>
        <div className="product-cell product-column-actions">
          <button
            className="product-edit-btn"
            onClick={() => openEditor(product)}
          >
            Edit
          </button>
          <button
            className="product-delete-btn"
            onClick={() => onDelete(product.companyProductId)}
          >
            Delete
          </button>
        </div>
      </Box>
    );
  };

  return (
    <div className="product-list-wrapper">
      <FormControl
        fullWidth
        sx={{ mb: 2, width: isMobile ? "100%" : "300px" }}
        variant="outlined"
      >
        <InputLabel shrink>Search products</InputLabel>
        <OutlinedInput
          notched
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          label="Search products"
        />
      </FormControl>

      <div className="product-list-scrollable">
        {!isMobile && (
          <div className="product-table-header">
            <div className="product-cell product-column-id">#</div>
            <div className="product-cell product-column-name">Product Name</div>
            <div className="product-cell product-column-package">Package</div>
            <div className="product-cell product-column-brand">Brand</div>
            <div className="product-cell product-column-family">
              Brand Family
            </div>
            <div className="product-cell product-column-supplier">Supplier</div>
            <div className="product-cell product-column-number">
              Supplier Product #
            </div>
            <div className="product-cell product-column-actions">Actions</div>
          </div>
        )}

        <List
          key={isMobile ? "mobile" : "desktop"} // ✅ forces re-render when switching
          height={Math.min(filteredProducts.length * rowHeight, height)}
          itemCount={filteredProducts.length}
          itemSize={rowHeight}
          width="100%"
        >
          {Row}
        </List>
      </div>

      <ProductEditorModal
        open={editorOpen}
        product={productToEdit}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

export default ProductTable;
