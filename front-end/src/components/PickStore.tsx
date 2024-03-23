import React from "react";
import { PostType } from "../utils/types";
import StoreLocator from "./StoreLocator";
import { Button } from "@mui/material";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  post: PostType;
  onStoreNameChange: (storeName: string) => void;
  onStoreNumberChange: (newStoreNumber: string) => void;
  onStoreAddressChange: (address: string) => void;
  onStoreCityChange: (city: string) => void;
  onStoreStateChange: (newStoreState: string) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  onNext,
  onPrevious,
  onStoreNameChange,
  onStoreNumberChange,
  onStoreAddressChange,
  onStoreCityChange,
  onStoreStateChange,
}) => {
  return (
    <div className="pick-store">
      <Button onClick={onPrevious}>
        <h4>Back</h4>
      </Button>
      <StoreLocator
        post={post}
        onStoreNameChange={onStoreNameChange}
        onStoreNumberChange={onStoreNumberChange}
        onStoreAddressChange={onStoreAddressChange}
        onStoreCityChange={onStoreCityChange}
        onStoreStateChange={onStoreStateChange}
      />
      <div className="store-address-container">
        <h4>Store: {post.selectedStore}</h4>
        <h6>Address: {post.storeAddress}</h6>
      </div>
      <Button onClick={onNext}>
        <h4>Next</h4>
      </Button>
    </div>
  );
};
