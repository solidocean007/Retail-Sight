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
  const brands = post.brands ?? [];
  const productTypes = post.productType ?? [];
  const detected = post.autoDetectedBrands ?? [];
  
  const isValid = useMemo(
    () => brands.length > 0 && productTypes.length > 0,
    [brands, productTypes]
  );

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

        {/* 🧠 Beta AI Brand Detection Preview */}
        {detected.length > 0 && (
          <div className="beta-ai-box">
            <h4>🧠 Beta AI Brand Detection</h4>
            <p>Detected brands in this image:</p>
            <ul className="ai-detected-list">
              {detected.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
        )}

        <BrandsSelector
          selectedBrands={brands}
          selectedProductType={productTypes}
          onChange={handleBrandsChange}
          rawCandidates={post.rawCandidates}
          autoDetectedBrands={post.autoDetectedBrands}
        />

        <TotalCaseCount
          handleTotalCaseCountChange={handleTotalCaseCountChange}
        />
      </section>
    </div>
  );
};
