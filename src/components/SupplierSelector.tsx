import React from 'react';

// Define your Supplier type
export type SupplierType = {
  id: string;
  name: string;
};

interface SupplierSelectorProps {
  selectedSupplier?: string;
  suppliers: SupplierType[];
  onSupplierChange: (supplierId: string) => void;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({ selectedSupplier, suppliers, onSupplierChange }) => {
  return (
    <select 
      title='supplier selector'
      value={selectedSupplier}
      onChange={(e) => onSupplierChange(e.target.value)}
    >
      <option value="">Select Supplier</option>
      {suppliers.map(supplier => (
        <option key={supplier.id} value={supplier.id}>
          {supplier.name}
        </option>
      ))}
    </select>
  );
};

export default SupplierSelector;
