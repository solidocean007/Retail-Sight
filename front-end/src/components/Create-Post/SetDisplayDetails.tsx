// src/components/SetDisplayDetails.tsx
import React, { useCallback, useMemo } from "react";
import "./setDisplayDetails.css";
import TotalCaseCount from "../TotalCaseCount";
import BrandsSelector from "../ProductsManagement/BrandsSelector";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import { PostInputType } from "../../utils/types";

interface SetDisplayDetailsProps {
  onNext: () => void;
  onPrevious: () => void;
  post: PostInputType;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleTotalCaseCountChange: (caseCount: number) => void;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  onNext,
  onPrevious,
  post,
  setPost,
  handleTotalCaseCountChange,
}) => {
  const dispatch = useAppDispatch();

  // Destructure & default
  const brands = post.brands ?? [];
  const productTypes = post.productType ?? [];

  // form validity
  const isValid = useMemo(
    () => brands.length > 0 && productTypes.length > 0,
    [brands, productTypes]
  );

  // unified handler for Next
  const handleNext = useCallback(() => {
    if (isValid) {
      onNext();
    } else {
      dispatch(showMessage("Select Brand and Product Type"));
    }
  }, [isValid, onNext, dispatch]);

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

  return (
    <div className="setDisplayDetails">
      <div className="header-controls">
        <button type="button" className="btn btn-secondary" onClick={onPrevious}>
          Back
        </button>
        <button type="button" className="btn" onClick={handleNext} disabled={!isValid}>
          Next
        </button>
      </div>

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
