//CreatePost.tsx
// import Modal from "@mui/material/Modal";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";

import React, { useState, useCallback } from "react";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Card,
  CardMedia,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import StoreLocator from "./StoreLocator";

import {
  handleSelectedStoreLogic,
  handleImageChangeLogic,
  handlePostSubmission,
} from "../utils/handlePostLogic";

type StoreType = {
  storeName: string;
  storeAddress: string;
};

export const CreatePost = () => {
  const [postType, setPostType] = useState<string>("public");
  const [description, setDescription] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  const dispatch = useDispatch(); // this is for setting store variables right?

  const handleSelectedStore = useCallback(
    (store: google.maps.places.PlaceResult, storeAddress: string) =>
      handleSelectedStoreLogic(store, storeAddress, setSelectedStore),
    []
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageChangeLogic({
      e,
      setSelectedFile,
      setSelectedImage,
      setSnackbarMessage,
      setSnackbarOpen,
    });
  };

  const navigate = useNavigate();

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
          {selectedFile ? "ChangeImage" : "Upload Image"}
          <input
            type="file"
            hidden
            onChange={handleImageChange}
            accept="image/*"
          />
        </Button>

        {selectedImage && (
          <Box mt={2}>
            <Card>
              <CardMedia
                component="img"
                image={selectedImage}
                alt="Selected Preview"
                style={{ maxHeight: "300px", width: "auto" }}
              />
            </Card>
          </Box>
        )}
        <StoreLocator setSelectedStore={handleSelectedStore} />
        <h4>Store: {selectedStore?.storeName}</h4>
        <h6>Address: {selectedStore?.storeAddress}</h6>

        <Box mt={2}>
          <TextField
            fullWidth
            variant="outlined"
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Box>

        <Box mt={2}>
          <Select
            fullWidth
            variant="outlined"
            value={postType}
            onChange={(e) => setPostType(e.target.value as string)}
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
          onClick={handlePostSubmission}
        >
          Submit Post
        </Button>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000} // Hide after 6 seconds
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
