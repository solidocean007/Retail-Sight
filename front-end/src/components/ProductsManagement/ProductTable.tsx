// ProductTable.tsx
import React, { useState } from "react";
import {
  Button,
  TextField,
  Box,
} from "@mui/material";
import { FixedSizeList as List } from "react-window";
import { ProductType } from "../../utils/types";

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
  rowHeight = 60,
  searchTerm = "",
  setSearchTerm = () => {},
  onEditSave,
  onDelete,
}) => {
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

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = filteredProducts[index];
    const isEditing = index === editIndex;

    return (
      <Box style={style} className="account-table-row">
        {isEditing ? (
          <>
            <TextField
              className="account-small-cell"
              value={editedProduct?.companyProductId || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, companyProductId: e.target.value } : null)
              }
            />
            <TextField
              className="account-cell name-cell"
              value={editedProduct?.productName || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, productName: e.target.value } : null)
              }
            />
            <TextField
              className="account-cell address-cell"
              value={editedProduct?.package || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, package: e.target.value } : null)
              }
            />
            <TextField
              className="account-small-cell"
              value={editedProduct?.brand || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, brand: e.target.value } : null)
              }
            />
            <TextField
              className="account-cell submitted-at-cell"
              value={editedProduct?.brandFamily || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, brandFamily: e.target.value } : null)
              }
            />
            <TextField
              className="account-small-cell"
              value={editedProduct?.productSupplier || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, productSupplier: e.target.value } : null)
              }
            />
            <TextField
              className="account-small-cell"
              value={editedProduct?.supplierProductNumber || ""}
              onChange={(e) =>
                setEditedProduct((prev) => prev ? { ...prev, supplierProductNumber: e.target.value } : null)
              }
            />
            <Button onClick={handleSave}>Save</Button>
            <Button onClick={() => setEditIndex(null)}>Cancel</Button>
          </>
        ) : (
          <>
            <div className="account-small-cell">{product.companyProductId}</div>
            <div className="account-cell name-cell">{product.productName}</div>
            <div className="account-cell address-cell">{product.package}</div>
            <div className="account-small-cell">{product.brand}</div>
            <div className="account-cell submitted-at-cell">{product.brandFamily}</div>
            <div className="account-small-cell">{product.productSupplier}</div>
            <div className="account-small-cell">{product.supplierProductNumber}</div>
            <Button
              onClick={() => {
                setEditIndex(index);
                setEditedProduct({ ...product });
              }}
            >
              Edit
            </Button>
            <Button color="error" onClick={() => onDelete(product.companyProductId)}>
              Delete
            </Button>
          </>
        )}
      </Box>
    );
  };

  return (
    <div className="account-list-wrapper">
      <TextField
        label="Search products"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <div className="account-table-header">
        <div className="account-small-cell">Product ID</div>
        <div className="account-cell name-cell">Product Name</div>
        <div className="account-cell address-cell">Package</div>
        <div className="account-small-cell">Brand</div>
        <div className="account-cell submitted-at-cell">Brand Family</div>
        <div className="account-small-cell">Supplier</div>
        <div className="account-small-cell">Supplier Product #</div>
        <div className="account-small-cell">Actions</div>
      </div>
      <List
        height={Math.min(filteredProducts.length * rowHeight, height)}
        itemCount={filteredProducts.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
};

export default ProductTable;
