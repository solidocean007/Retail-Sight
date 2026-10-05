import React, { useCallback } from "react";
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
  const isValid = brands.length > 0 && productTypes.length > 0;

  const getCandidateBrandName = (candidate: any): string => {
    if (typeof candidate === "string") return candidate;

    return (
      candidate?.brandName ||
      candidate?.matchedBrandName ||
      candidate?.name ||
      candidate?.label ||
      ""
    );
  };

  const normalizeBrand = (value: string) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const handleBrandsChange = useCallback(
    (newBrands: string[], newProductTypes: string[], brandIds: string[]) => {
      setPost((prev) => ({
        ...prev,
        brands: newBrands,
        brandIds,
        productType: newProductTypes,
      }));
    },
    [setPost],
  );

  return (
    <div className="setDisplayDetails">
      <section className="property-zone">
        <div className="set-display-instructions">
          <h2>Set Display Details</h2>
          <p>Select the brands and product types for this display.</p>
          {post.account?.originCompanyName && (
            <p>Shared brands for {post.account.originCompanyName}</p>
          )}
          {!isValid && (
            <p className="error-message">Select Brand and Product Type</p>
          )}
        </div>

        <BrandsSelector
          selectedBrands={brands}
          selectedProductType={productTypes}
          onChange={handleBrandsChange}
          rawCandidates={post.rawCandidates}
          partnerCompanyId={post.account?.originCompanyId}
          // autoDetectedBrands={post.autoDetectedBrands}
        />

        <TotalCaseCount
          handleTotalCaseCountChange={handleTotalCaseCountChange}
          initialValue={post.totalCaseCount}
          minimum={0}
          label="Display quantity"
        />
      </section>
    </div>
  );
};
