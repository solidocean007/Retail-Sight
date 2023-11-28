import React from "react";

// Define your Brand type
export type BrandType = {
  id: string;
  name: string;
};

interface BrandSelectorProps {
  selectedBrand?: string;
  brands: BrandType[];
  onBrandChange: (brandId: string) => void;
}

const BrandSelector: React.FC<BrandSelectorProps> = ({
  selectedBrand,
  brands,
  onBrandChange,
}) => {
  return (
    <select
      title="brands selector"
      value={selectedBrand}
      onChange={(e) => onBrandChange(e.target.value)}
    >
      <option value="">Select Brand</option>
      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>
  );
};

export default BrandSelector;