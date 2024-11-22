import React from "react";
import { PostType } from "../../utils/types";
import StoreLocator from "../StoreLocator";
import "./pickstore.css";

interface PickStoreProps {
  onNext: () => void;
  onPrevious: () => void;
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>,
  onStoreNameChange: (storeName: string) => void;
  onStoreNumberChange: (newStoreNumber: string) => void;
  onStoreAddressChange: (address: string) => void;
  onStoreCityChange: (city: string) => void;
  onStoreStateChange: (newStoreState: string) => void;
}

export const PickStore: React.FC<PickStoreProps> = ({
  post,
  setPost,
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
      <div style={{ display: "flex" }}>
        <button className="create-post-btn" onClick={onPrevious}>
          <h4>Back</h4>
        </button>
        {post.selectedStore && (
          <button className="create-post-btn" onClick={onNext}>
            <h4>Next</h4>
          </button>
        )}
      </div>
      <div className="store-address-container">
        {post.selectedStore && <h4>Store: {post.selectedStore}</h4>}
        {post.storeAddress && <h6>Address: {post.storeAddress}</h6>}
      </div>

      <StoreLocator
        post={post}
        setPost={setPost}
        onStoreNameChange={onStoreNameChange}
        onStoreNumberChange={onStoreNumberChange}
        onStoreAddressChange={onStoreAddressChange}
        onStoreCityChange={onStoreCityChange}
        onStoreStateChange={onStoreStateChange}
      />
    </div>
  );
};
