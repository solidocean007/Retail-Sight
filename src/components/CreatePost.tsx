import { db } from "../firebase"; // adjust the path as necessary
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase";

import { useDispatch } from 'react-redux';
import { showMessage } from '../snackbarSlice';  // Adjust the path as necessary

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import Snackbar from "@mui/material/Snackbar";

import React, { useState } from "react";
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
import { useNavigate } from "react-router-dom";

export const CreatePost: React.FC = () => {
  const [postType, setPostType] = useState<string>("public");
  const [description, setDescription] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];

    if (file) {
      // Check for supported image types
      const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
      if (validImageTypes.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
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

  const handlePostSubmission = async () => {
    const user = auth.currentUser;

    if (!user) return; // No user, abort the function
    
    const uid = user.uid;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

    const imageFileName = `${uid}-${Date.now()}.jpg`;
    const imagePath = `images/${formattedDate}/${uid}/${imageFileName}`;

    try {
      const storage = getStorage();
      const storageRef = ref(storage, imagePath);

      if (selectedImage) {
        const response = await fetch(selectedImage);
        const blob = await response.blob();

        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log("Upload is " + progress + "% done");
          },
          (error) => {
            dispatch(showMessage(`Error uploading image. Please try again.${error}`));
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Fetch the user's data from Firestore
            const userDocRef = doc(db, "users", uid);
            const userDocSnapshot = await getDoc(userDocRef);
            const userData = userDocSnapshot.data();

            if (!userData) {
              console.error("User data not found for ID:", uid);
              return;
            }

            const postData = {
              description: description,
              imageUrl: downloadURL,
              postType: postType,
              timestamp: new Date(),
              user: {
                name: `${userData.firstName} ${userData.lastName}`,
                company: userData.company
              }
            };

            await addDoc(collection(db, "posts"), postData);
            dispatch(showMessage("Post added successfully!"));

            // Navigate to another page or provide feedback to the user
            navigate("/userHomePage");
          }
        );
      }
    } catch (error) {
      console.error("Error adding post:", error);
    }
};


  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => {
              navigate('/userHomePage')
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Create Post
          </Typography>
        </Toolbar>
      </AppBar>

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
                style={{ maxHeight: '400px', width: 'auto' }} 
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
  );
};
