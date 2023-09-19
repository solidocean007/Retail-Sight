//EditPostModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "@mui/material/Modal";
import { PostType } from "../utils/types";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  Box,
  Card,
  CardMedia,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

// import { handleImageChangeLogic } from "../utils/handlePostLogic";

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPost: PostType) => void;
  onDelete: (postId: string) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [description, setDescription] = useState<string>(
    post.description || ""
  );
  const [postType, setPostType] = useState<string>(post.postType || "public");
  const [selectedImage, setSelectedImage] = useState<string | null>(
    post.imageUrl || null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    setDescription(post.description); // Type 'undefined' is not assignable to type 'SetStateAction<string>'
    setPostType(post.postType); // Type 'undefined' is not assignable to type 'SetStateAction<string>'
    setSelectedImage(post.imageUrl); // Type 'undefined' is not assignable to type 'SetStateAction<string>'
    // ... initialize other states
  }, [post]);

  const handleSave = () => {
    const updatedPost = {
      ...post,
      description,
      postType,
      // ... other updated fields
    };
    onSave(updatedPost);
  };

  // ... rest of your methods including handleImageChange
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleImageChange triggered");
    handleImageChangeLogic({
      e,
      setSelectedFile, // Cannot find
      setSelectedImage,
      setSnackbarMessage, //No value exists in scope for the shorthand property 'setSnackbarMessage'.
      setSnackbarOpen, // No value exists in scope for the shorthand property 'setSnackbarOpen'
    });
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div style={{ padding: "20px", backgroundColor: "white" }}>
        <h4>Store: {post.store.storeName}</h4>{" "}
        {/* I should be able to edit this field*/}
        <h6>Address: {post.store.storeAddress}</h6>
        <Box p={3}>
          <Button
            variant="contained"
            component="label"
            startIcon={<AddAPhotoIcon />}
          >
            Update Image
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
            </Select>
          </Box>

          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSave}
            >
              Save Changes
            </Button>
            <Button onClick={() => onDelete(post.id)}>Delete Post</Button>

          </Box>
        </Box>
      </div>
    </Modal>
  );
};

export default EditPostModal;
