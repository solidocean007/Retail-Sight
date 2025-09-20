// src/components/SetDisplayDetails.tsx
import React, { useCallback, useMemo } from "react";
import "./setDisplayDetails.css";
import TotalCaseCount from "../TotalCaseCount";
import BrandsSelector from "../ProductsManagement/BrandsSelector";
import { PostInputType } from "../../utils/types";

interface SetDisplayDetailsProps {
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleTotalCaseCountChange: (caseCount: number) => void;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  post,
  setPost,
  handleTotalCaseCountChange,
}) => {
  // Destructure & default
  const brands = post.brands ?? [];
  const productTypes = post.productType ?? [];

  // form validity
  const isValid = useMemo(
    () => brands.length > 0 && productTypes.length > 0,
    [brands, productTypes]
  );

  // pull out setPost into a stable callback
  const handleBrandsChange = useCallback(
    (newBrands: string[], newProductTypes: string[]) => {
      setPost((prev) => ({
        ...prev,
        brands: newBrands,
        productType: newProductTypes,
      }));
    },
    [setPost]
  );

  console.log("selected brands: ", brands);
  console.log("selected types: ", productTypes);

  return (
    <div className="setDisplayDetails">
      <section className="property-zone">
        <div className="set-display-instructions">
          <h2>Set Display Details</h2>
          <p>Select the brands and product types for this display.</p>
          {!isValid && (
            <p className="error-message">Select Brand and Product Type</p>
          )}
        </div>

        <BrandsSelector
          selectedBrands={brands}
          selectedProductType={productTypes}
          onChange={handleBrandsChange}
        />

        <TotalCaseCount
          handleTotalCaseCountChange={handleTotalCaseCountChange}
        />
      </section>
    </div>
  );
};
