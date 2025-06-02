// ProductTable.tsx
import React, { useState } from "react";
import { Button, TextField, Box, useMediaQuery, FormControl, InputLabel, OutlinedInput } from "@mui/material";
import { VariableSizeList as List } from 'react-window';
import { ProductType } from "../../utils/types";
import "./styles/productTable.css";
import MobileProductCard from "./MobileProductCard";

interface ProductTableProps {
  products: ProductType[];
  height?: number;
  rowHeight?: number;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onEditSave: (updated: ProductType) => void;
  onDelete: (productId: string) => void;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  height = 500,
  rowHeight,
  searchTerm = "",
  setSearchTerm = () => {},
  onEditSave,
  onDelete,
}) => {
  const isMobile = useMediaQuery("(max-width:1200px)");
  const computedRowHeight = rowHeight || (isMobile ? 400 : 80);
  const getItemSize = (index: number) => isMobile ? 400 : 60;
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editedProduct, setEditedProduct] = useState<ProductType | null>(null);

  const filteredProducts = products.filter((p) =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (editedProduct) {
      onEditSave(editedProduct);
      setEditIndex(null);
      setEditedProduct(null);
    }
  };

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const product = filteredProducts[index];
    const isEditing = index === editIndex;

    if (isMobile) {
      return (
        <MobileProductCard
          product={product}
          style={style}
          onEdit={() => {
            setEditIndex(index);
            setEditedProduct({ ...product });
          }}
          onDelete={() => onDelete(product.companyProductId)}
        />
      );
    }

    return (
      <Box style={style} className="product-row">
        {isEditing ? (
          <>
            <TextField
              className="product-cell product-column-id"
              value={editedProduct?.companyProductId || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, companyProductId: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-name"
              value={editedProduct?.productName || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, productName: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-package"
              value={editedProduct?.package || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, package: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-brand"
              value={editedProduct?.brand || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, brand: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-family"
              value={editedProduct?.brandFamily || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, brandFamily: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-supplier"
              value={editedProduct?.productSupplier || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev ? { ...prev, productSupplier: e.target.value } : null
                )
              }
            />
            <TextField
              className="product-cell product-column-number"
              value={editedProduct?.supplierProductNumber || ""}
              onChange={(e) =>
                setEditedProduct((prev) =>
                  prev
                    ? {
                        ...prev,
                        supplierProductNumber: e.target.value,
                      }
                    : null
                )
              }
            />
            <div className="product-cell product-column-actions">
              <Button onClick={handleSave}>Save</Button>
              <Button onClick={() => setEditIndex(null)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <div className="product-cell product-column-id">
              {product.companyProductId}
            </div>
            <div className="product-cell product-column-name">
              {product.productName}
            </div>
            <div className="product-cell product-column-package">
              {product.package}
            </div>
            <div className="product-cell product-column-brand">
              {product.brand}
            </div>
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
                onClick={() => {
                  setEditIndex(index);
                  setEditedProduct({ ...product });
                }}
              >
                Edit
              </button>
              <button
                className="product-delete-btn"
                color="error"
                onClick={() => onDelete(product.companyProductId)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </Box>
    );
  };

  return (
    <div className="product-list-wrapper">
      <FormControl
        fullWidth
        sx={{ mb: 2, width: isMobile ? "60%" : "300px" }}
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
          height={Math.min(filteredProducts.length * computedRowHeight, height)}
          itemCount={filteredProducts.length}
          itemSize={getItemSize}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default ProductTable;
