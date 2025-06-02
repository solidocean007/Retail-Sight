import React, { useState } from "react";
import CategorySelector, { CategoryType } from "./CategorySelector";
import ChannelSelector, { ChannelType } from "./ChannelSelector";
import "./setDisplayDetails.css";
import TotalCaseCount from "../TotalCaseCount";
import ProductSelector from "../ProductsManagement/ProductSelector";
import { useSelector } from "react-redux";
import { selectAllProducts } from "../../Slices/productsSlice";
import { ProductType } from "../../utils/types";

interface SetDisplayDetailsProps {
  onNext: () => void;
  onPrevious: () => void;
  handleTotalCaseCountChange: (caseCount: number) => void;
  selectedChannel: ChannelType;
  setSelectedChannel: React.Dispatch<React.SetStateAction<ChannelType>>;
  selectedCategory: CategoryType;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryType>>;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  onNext,
  onPrevious,
  handleTotalCaseCountChange,
  selectedChannel,
  setSelectedChannel,
  selectedCategory,
  setSelectedCategory,
}) => {
  const companyProducts = useSelector(selectAllProducts);
  const [selectedProducts, setSelectedProducts] = useState<ProductType[]>([]);

  return (
    <div className="setDisplayDetails">
      <button className="create-post-btn" onClick={onPrevious}>
        Back
      </button>
      <div className="property-zone">
        {/* <ProductSelector
          availableProducts={companyProducts}
          selectedProducts={selectedProducts}
          onSelect={setSelectedProducts}
        /> */}

        <ChannelSelector
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
        />

        <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        <TotalCaseCount
          handleTotalCaseCountChange={handleTotalCaseCountChange}
        />
      </div>
      <button className="create-post-btn" onClick={onNext}>
        Next
      </button>
    </div>
  );
};
