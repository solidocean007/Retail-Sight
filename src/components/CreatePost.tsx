// CreatePost.tsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// import { Timestamp } from "firebase/firestore";
import { selectUser } from "../Slices/userSlice"; // Module '"../Slices/userSlice"' has no exported member 'selectUser'. Did you mean to use 'import selectUser from "../Slices/userSlice"' instead?ts(2614)

import ChannelSelector from "./ChannelSelector";
import CategorySelector from "./CategorySelector";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardMedia,
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
// import { useHandlePostSubmission } from "../utils/PostLogic/handlePostCreation";
import { useHandlePostSubmission } from "../utils/PostLogic/handlePostCreation";
import { PostType } from "../utils/types";
import { CategoryType } from "./CategorySelector";
import { ChannelType } from "./ChannelSelector";
// import { SupplierType } from "./SupplierSelector";
// import { BrandType } from "./BrandsSelector";
import "./createPost.css";

export const CreatePost = () => {
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
    id: "",
    category: selectedCategory,
    channel: selectedChannel,
    description: "",
    imageUrl: "",
    selectedStore: "",
    storeAddress: "",
    state: "",
    city: "",
    visibility: "public",
    supplier: "",
    brands: [],
    timestamp: "",
    user: {
      postUserName: `${userData?.firstName} ${userData?.lastName}`,
      postUserId: userData?.uid,
      postUserCompany: userData?.company,
    },
    likes: 0,
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

  const handleSelectedStore = (
    storeName: string,
    storeAddress: string,
    state?: string,
    city?: string
  ) => {
    setPost((prev) => ({
      ...prev,
      selectedStore: storeName,
      storeAddress: storeAddress,
      state: state,
      city: city,
    }));
  };

  // Update this to handle all field changes generically, including channel and category
  const handleFieldChange = (
    field: keyof PostType,
    value: string | number | boolean | string[] // Add other types as needed
  ) => { // what type should value be?
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
      <AppBar position="static" style={{ flexShrink: 0 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/userHomePage")}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h5" style={{ flexGrow: 1 }}>
            Create Post
          </Typography>
        </Toolbar>
      </AppBar>
      <Box p={1}>
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
          <Box mt={2}>
            <Card>
              <CardMedia
                component="img"
                image={post.imageUrl}
                alt="Selected Preview"
                style={{ maxHeight: "300px", width: "auto" }}
              />
            </Card>
          </Box>
        )}
        <StoreLocator post={post} handleSelectedStore={handleSelectedStore} />
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
            rows={3}
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
            <MenuItem value="private">Company only</MenuItem>
            {/* <MenuItem disabled value="group">Supplier</MenuItem> */}
            {/* <MenuItem value="group">Supplier & Company</MenuItem> */}
          </Select>
        </Box>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          onClick={() => {
            if (selectedFile) {
              // Pass the current post state directly
              handlePostSubmission(
                {
                  ...post,
                  category: selectedCategory,
                  channel: selectedChannel,
                  // supplier: selectedSupplier,
                  // brands: selectedBrands,
                },
                selectedFile
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
  );
};
