// CreatePost.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectUser } from "../Slices/userSlice";

import ChannelSelector from "./ChannelSelector";
import CategorySelector from "./CategorySelector";
import {
  AppBar,
  Box,
  Button,
  // Card,
  // CardMedia,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

import StoreLocator from "./StoreLocator";
import { useHandlePostSubmission } from "../utils/PostLogic/handlePostCreation";
import { PostType } from "../utils/types";
import { CategoryType } from "./CategorySelector";
import { ChannelType } from "./ChannelSelector";
// import { SupplierType } from "./SupplierSelector";
// import { BrandType } from "./BrandsSelector";
import "./createPost.css";
import LoadingIndicator from "./LoadingIndicator";

export const CreatePost = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress
  useEffect(() => {
    console.log("CreatePost mounts");
    return () => {
      console.log("CreatePost unmounts");
    };
  }, []);

  const handlePostSubmission = useHandlePostSubmission();
  // State Management
  const userData = useSelector(selectUser);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryType>("Beer");
  const [selectedChannel, setSelectedChannel] =
    useState<ChannelType>("Grocery");
  // const [selectedSupplier, setSelectedSupplier] = useState<SupplierType>({
  //   id: "",
  //   name: "",
  // });
  // const [selectedBrands, setSelectedBrands] = useState<BrandType[]>([]);
  const [post, setPost] = useState<PostType>({
    category: selectedCategory,
    channel: selectedChannel,
    description: "",
    imageUrl: "",
    selectedStore: "",
    storeNumber: "",
    storeAddress: "",
    state: "",
    city: "",
    visibility: "public",
    supplier: "",
    brands: [],
    displayDate: '',
    timestamp: "",
    user: {
      postUserName: `${userData?.firstName} ${userData?.lastName}`,
      postUserId: userData?.uid,
      postUserCompany: userData?.company,
      postUserEmail: userData?.email,
    },
    likes: [],
    hashtags: [""],
    commentCount: 0,
  });

  useEffect(() => {
    // Fetch suppliers and brands logic here
  }, []);

  // Logic
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    setSelectedFile(file);
    if (file) {
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPost({ ...post, imageUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      } else {
        setSnackbarMessage(
          "Unsupported file type. Please upload a valid image."
        );
        setSnackbarOpen(true);
      }
    }
  };

  const handleStoreNameChange = useCallback((storeName: string) => {
    setPost((prev) => ({ ...prev, selectedStore: storeName }));
  },[]);

  const handleStoreNumberChange = useCallback((newStoreNumber: string) => {
    setPost((prev) => ({ ...prev, storeNumber: newStoreNumber }));
  },[]);

  const handleStoreAddressChange = useCallback((address: string) => {
    setPost((prev) => ({ ...prev, storeAddress: address }));
  },[]);

  const handleStoreCityChange = useCallback((city: string) => {
    setPost((prev) => ({ ...prev, city: city }));
  },[]);

  const handleStoreStateChange = useCallback((newStoreState: string) => {
    setPost((prev) => ({ ...prev, state : newStoreState }));
  },[]);

  // Update this to handle all field changes generically, including channel and category
  const handleFieldChange = (
    field: keyof PostType,
    value: string | number | boolean | string[] // Add other types as needed
  ) => {
    // what type should value be?
    // specify a different type other than any
    setPost({ ...post, [field]: value });
  };

  // Add handlers for Supplier and Brand changes
  // const handleSupplierChange = (supplierId: string) => {
  //   setSelectedSupplier(supplierId);
  //   // Update the post object
  //   setPost((prev) => ({ ...prev, supplier: supplierId }));
  // };

  // const handleBrandChange = (brandId: string) => {
  //   // If you're allowing multiple brands, you'll need logic to handle selection and deselection
  //   setSelectedBrands((prevBrands) => {
  //     // This is just an example logic, assuming you want to toggle brands in the selection
  //     if (prevBrands.includes(brandId)) {
  //       return prevBrands.filter((id) => id !== brandId);
  //     } else {
  //       return [...prevBrands, brandId];
  //     }
  //   });
  //   // Update the post object
  //   setPost((prev) => ({ ...prev, brands: selectedBrands }));
  // };

  return (
    <div className="create-post-container">
        {isUploading && (
        <div className="modal">
          <LoadingIndicator progress={uploadProgress} />
        </div>
      )}

      <AppBar position="static" style={{ flexShrink: 0 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="default"
            onClick={() => navigate("/")}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h5" style={{ flexGrow: 1 }}>
            Capture Post
          </Typography>
        </Toolbar>
      </AppBar>

      <div className="image-and-details">
        <div className="image-selection-box">
          <Button
            variant="contained"
            component="label"
            startIcon={<AddAPhotoIcon />}
          >
            {post.imageUrl ? "ChangeImage" : "Upload Image"}
            <input
              type="file"
              hidden
              onChange={handleImageChange}
              accept="image/*"
            />
          </Button>
          {post.imageUrl && (
            <div className="image-box">
              <img src={post.imageUrl} alt="Post" className="post-image" />
            </div>
          )}
        </div>
        <div className="post-detail-selection">
          <StoreLocator
            post={post}
            onStoreNameChange={handleStoreNameChange}
            onStoreNumberChange={handleStoreNumberChange}
            onStoreAddressChange={handleStoreAddressChange}
            onStoreCityChange={handleStoreCityChange}
            onStoreStateChange={handleStoreStateChange}
          />
          <h4>Store: {post.selectedStore}</h4>
          <h6>Address: {post.storeAddress}</h6>

          <div className="property-zone">
            <ChannelSelector
              selectedChannel={selectedChannel}
              onChannelChange={setSelectedChannel}
            />

            <CategorySelector
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          <div className="supplier-brands-selector">
            {/* <SupplierSelector
            selectedSupplier={selectedSupplier.id} // Pass the selected supplier ID
            suppliers={suppliers}
            onSupplierChange={handleSupplierChange}
          />
          <BrandsSelector
          selectedBrands={selectedBrands} // Pass the selected brands array
          brands={brands}
          onBrandChange={handleBrandChange}
          /> */}
          </div>

          <Box mt={2}>
            <TextField
              className="description-box"
              fullWidth
              variant="outlined"
              label="Description"
              multiline
              rows={2}
              value={post.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
            />
          </Box>

          <Box mt={2}>
            <Select
              fullWidth
              variant="outlined"
              value={post.visibility}
              onChange={(e) => handleFieldChange("visibility", e.target.value)}
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="company">Company only</MenuItem>
              {/* <MenuItem disabled value="group">Supplier</MenuItem> */}
              {/* <MenuItem value="group">Supplier & Company</MenuItem> */}
            </Select>
          </Box>

          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              onClick={() => {
                if (selectedFile) {
                  setIsUploading(true);
                  // Pass the current post state directly
                  handlePostSubmission(
                    {
                      ...post,
                      category: selectedCategory,
                      channel: selectedChannel,
                      // supplier: selectedSupplier,
                      // brands: selectedBrands,
                    },
                    selectedFile,
                    setIsUploading,
                    setUploadProgress,
                  );
                } else {
                  // Handle the situation where selectedFile is null
                }
              }}
            >
              Submit Post
            </Button>
          </Box>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000} // Hide after 4 seconds
            onClose={() => setSnackbarOpen(false)}
            message={snackbarMessage}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setSnackbarOpen(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          />
        </div>
      </div>
    </div>
  );
};