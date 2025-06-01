// components/ProductTable/MobileProductCard.tsx
import React from "react";
import { ProductType } from "../../utils/types";
import { Button, Box, Typography } from "@mui/material";
import "./styles/mobileProductCard.css";

interface Props {
  product: ProductType;
  onEdit: () => void;
  onDelete: () => void;
}

const MobileProductCard: React.FC<Props> = ({ product, onEdit, onDelete }) => {
  return (
   <div className="mobile-product-card">
      {/* Row 1 */}
      <div className="mobile-product-label">name:</div>
      <div className="mobile-product-value">{product.productName}</div>
      <div className="mobile-product-label">#</div>
      <div className="mobile-product-value">{product.companyProductId}</div>

      {/* Row 2 */}
      <div className="mobile-product-label">package:</div>
      <div className="mobile-product-value">{product.package}</div>
      <div className="mobile-product-label">brand:</div>
      <div className="mobile-product-value">{product.brand}</div>

      {/* Row 3 */}
      <div className="mobile-product-label">brand family:</div>
      <div className="mobile-product-value">{product.brandFamily}</div>
      <div className="mobile-product-label">supplier:</div>
      <div className="mobile-product-value">{product.productSupplier}</div>

      {/* Row 4 */}
      <div className="mobile-product-label">supplier id:</div>
      <div className="mobile-product-value">{product.supplierProductNumber}</div>
      <div className="mobile-product-actions">
        <button className="product-edit-btn" onClick={onEdit}>edit</button>
        <button className="product-delete-btn" onClick={onDelete}>delete</button>
      </div>
    </div>
  );
};

export default MobileProductCard;
