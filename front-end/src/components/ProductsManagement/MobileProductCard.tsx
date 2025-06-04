// components/ProductTable/MobileProductCard.tsx
import React from "react";
import { ProductType } from "../../utils/types";
import "./styles/mobileProductCard.css";

interface Props {
  product: ProductType;
  style?: React.CSSProperties;
  onEdit: () => void;
  onDelete: () => void;
}

const MobileProductCard: React.FC<Props> = ({
  product,
  style,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="mobile-product-card" style={style}>
      <div className="mobile-product-card-inner">
        {/* Row 1 */}
        <div className="mobile-product-label">Name:</div>
        <div className="mobile-product-value">{product.productName}</div>
        <div className="mobile-product-label">Product Number</div>
        <div className="mobile-product-value">{product.companyProductId}</div>

        {/* Row 2 */}
        <div className="mobile-product-label">Package:</div>
        <div className="mobile-product-value">{product.package}</div>
        <div className="mobile-product-label">Brand:</div>
        <div className="mobile-product-value">{product.brand}</div>

        {/* Row 3 */}
        <div className="mobile-product-label">Brand Family:</div>
        <div className="mobile-product-value">{product.brandFamily}</div>
        <div className="mobile-product-label">Supplier:</div>
        <div className="mobile-product-value">{product.productSupplier}</div>

        {/* Row 4 */}
        <div className="mobile-product-label">Supplier id:</div>
        <div className="mobile-product-value">
          {product.supplierProductNumber}
        </div>
        <div className="mobile-product-actions">
          <button className="product-edit-btn" onClick={onEdit}>
            Edit
          </button>
          <button className="product-delete-btn" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileProductCard;
