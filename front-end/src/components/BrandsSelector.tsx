// import React, { useState } from "react";
import React from "react";

// Define your Brand type
export type BrandType = {
  id: string;
  name: string;
  supplierId: string;
};

interface BrandSelectorProps {
  selectedBrand?: string;
  // brands: BrandType[];
  // onBrandChange: (brandId: string) => void;
  // addNewBrand: (brandName: string) => void;
}

const BrandSelector: React.FC<BrandSelectorProps> = ({
  selectedBrand,
  // brands,
  // onBrandChange,
  // addNewBrand,
}) => {
  // const [brandInput, setBrandInput] = useState('');

  // const handleAddBrand = () => {
  //   if (brandInput.trim()) {
  //     // addNewBrand(brandInput);
  //     setBrandInput(''); // Reset the input field after adding
  //   }
  // };
  return (
    <>
      <select
        disabled
        title="brands selector"
        value={selectedBrand}
        // onChange={(e) => onBrandChange(e.target.value)}
      >
        <option value="">Select Brand</option>
        {/* {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))} */}
      </select>
      <div>
        {/* <input
          type="text"
          value={brandInput}
          onChange={(e) => setBrandInput(e.target.value)}
          placeholder="Enter new brand"
        />
        <button onClick={handleAddBrand}>Add Brand</button> */}
      </div>
    </>
  );
};

export default BrandSelector;
