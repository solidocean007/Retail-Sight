// CreatePost.tsx
import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { selectUser } from "../Slices/userSlice";
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
import { useHandlePostSubmission } from "../utils/handlePostLogic";
import { PostType } from "../utils/types";

export const CreatePost = () => {
  const handlePostSubmission = useHandlePostSubmission();
  // State Management
  const currentUser = useSelector(selectUser);
  const [post, setPost] = useState<PostType>({
    description: "",
    imageUrl: "",
    selectedStore: "",
    storeAddress: '',
    postType: "public",
    timeStamp: '',
    uid: currentUser.user?.uid,
    likes: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Logic
  const navigate = useNavigate();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    setSelectedFile(file);
    if (file) {
      const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPost({ ...post, imageUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      } else {
        setSnackbarMessage("Unsupported file type. Please upload a valid image.");
        setSnackbarOpen(true);
      }
    }
  };
  
  const handleSelectedStore = (storeName: string, storeAddress: string) => {
    setPost(prev => ({
      ...prev,
      selectedStore: storeName,
      storeAddress: storeAddress,
    }));
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setPost({ ...post, [field]: value });
  };

  return (
    <div>
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
        <StoreLocator post={post} handleSelectedStore={handleSelectedStore}  />
        <h4>Store: {post.selectedStore}</h4> 
        <h6>Address: {post.selectedStore}</h6>

        <Box mt={2}>
          <TextField
            fullWidth
            variant="outlined"
            label="Description"
            multiline
            rows={4}
            value={post.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
          />
        </Box>

        <Box mt={2}>
          <Select
            fullWidth
            variant="outlined"
            value={post.postType}
            onChange={(e) => handleFieldChange('postType', e.target.value)}
          >
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
            <MenuItem value="group">Group</MenuItem>
            {/* Add more types as needed */}
          </Select>
        </Box>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => {
            if (selectedFile) {
              handlePostSubmission(post, selectedFile);
            } else {
              // handle the situation where selectedFile is null
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
