import React, { useState } from "react";
// import CategorySelector, { CategoryType } from "./CategorySelector";
// import ChannelSelector, { ChannelType } from "./ChannelSelector";
import "./setDisplayDetails.css";
import TotalCaseCount from "../TotalCaseCount";
// import ProductSelector from "../ProductsManagement/ProductSelector";
// import { useSelector } from "react-redux";
// import { selectAllProducts } from "../../Slices/productsSlice";
// import { PostInputType, ProductType } from "../../utils/types";
import { PostInputType } from "../../utils/types";
import BrandsSelector from "../ProductsManagement/BrandsSelector";

interface SetDisplayDetailsProps {
  onNext: () => void;
  onPrevious: () => void;
  setPost: React.Dispatch<React.SetStateAction<PostInputType>>;
  handleTotalCaseCountChange: (caseCount: number) => void;
  // selectedChannel: string;
  // setSelectedChannel: React.Dispatch<React.SetStateAction<string>>;
//   selectedCategory: string;
//   setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
}

export const SetDisplayDetails: React.FC<SetDisplayDetailsProps> = ({
  onNext,
  onPrevious,
  setPost,
  handleTotalCaseCountChange,
  // selectedChannel,
  // setSelectedChannel,
  // selectedCategory,
  // setSelectedCategory,
}) => {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const handleSelectedBrandsChange = (brands: string[]) => {
    setSelectedBrands(brands);
    setPost((prev: PostInputType) => ({ ...prev, brands }));
  };

  // const handleChannelChange = (chan: ChannelType) => {
  //   setSelectedChannel(chan);
  //   setPost((prev: PostInputType) => ({ ...prev, channel: chan }));
  // };

  // const handleCategoryChange = (cat: CategoryType) => {
  //   setSelectedCategory(cat);
  //   setPost((prev: PostInputType) => ({ ...prev, category: cat }));
  // };

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
         <BrandsSelector
          selectedBrands={selectedBrands}
          onChange={handleSelectedBrandsChange}
        />

        {/* <ChannelSelector
          selectedChannel={selectedChannel}
          onChannelChange={setSelectedChannel}
        /> */}

        {/* <CategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        /> */}
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
