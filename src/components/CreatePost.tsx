//CreatePost.tsx
import Modal from "@mui/material/Modal";
import { useDispatch } from "react-redux";
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

interface CreatePostProps {
  toggleOpenCreatePost: () => void;
  isOpen: boolean;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  toggleOpenCreatePost,
  isOpen,
}) => {
  const [postType, setPostType] = useState<string>("public");
  const [description, setDescription] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  const dispatch = useDispatch();

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

  return (
    <Modal open={isOpen} onClose={toggleOpenCreatePost}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          height: "100vh", // full viewport height
          width: "60vw", // full viewport width
        }}
      >
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleOpenCreatePost}
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" style={{ flexGrow: 1 }}>
              Create Post
            </Typography>
          </Toolbar>
        </AppBar>
        <StoreLocator  setSelectedStore={handleSelectedStore} />
        <h4>Store: {selectedStore?.storeName}</h4>
        <h6>Address: {selectedStore?.storeAddress}</h6>
        <Box p={3}>
          <Button
            variant="contained"
            component="label"
            startIcon={<AddAPhotoIcon />}
          >
            Upload Image
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
                  style={{ maxHeight: "400px", width: "auto" }}
                />
              </Card>
            </Box>
          )}

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
    </Modal>
  );
};
