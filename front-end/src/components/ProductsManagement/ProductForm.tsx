import React, { useState } from "react";
import { ProductType } from "../../utils/types";
import "../AccountManagement/styles/accountForm.css";

interface ProductFormProps {
  isOpen: boolean;
  initialData?: ProductType;
  onSubmit: (data: ProductType) => void;
  onCancel?: () => void;
  editMode?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  initialData,
  onSubmit,
  onCancel,
  editMode,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<ProductType>(
    initialData || {
      companyProductId: "",
      productName: "",
      package: "",
      productType: "",
      brand: "",
      brandFamily: "",
      productSupplier: "",
      supplierProductNumber: "",
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      alert("Product name is required.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="account-form-backdrop">
      <form onSubmit={handleSubmit} className="account-form">
        <h2>{editMode ? "Edit Product" : "Add New Product"}</h2>

        <label>
          Company Product ID:
          <input
            name="companyProductId"
            maxLength={10}
            value={formData.companyProductId}
            onChange={handleChange}
            placeholder="e.g. PROD123"
            required={!editMode} // required only when adding
          />
        </label>

        <label>
          Product Name:
          <input
            name="productName"
            maxLength={50}
            value={formData.productName}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Package:
          <input
            name="package"
            maxLength={50}
            value={formData.package}
            onChange={handleChange}
          />
        </label>

        <label>
          Product Type:
          <input
            name="productType"
            maxLength={50}
            value={formData.productType}
            onChange={handleChange}
          />
        </label>

        <label>
          Brand:
          <input
            name="brand"
            maxLength={50}
            value={formData.brand || ""}
            onChange={handleChange}
          />
        </label>

        <label>
          Brand Family:
          <input
            name="brandFamily"
            maxLength={50}
            value={formData.brandFamily || ""}
            onChange={handleChange}
          />
        </label>

        <label>
          Product Supplier:
          <input
            name="productSupplier"
            maxLength={50}
            value={formData.productSupplier || ""}
            onChange={handleChange}
          />
        </label>

        <label>
          Supplier Product Number:
          <input
            name="supplierProductNumber"
            maxLength={50}
            value={formData.supplierProductNumber || ""}
            onChange={handleChange}
          />
        </label>

        <div className="form-actions">
          <button type="submit">
            {editMode ? "Save Changes" : "Save"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
