import React, { useState } from 'react';
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
  CardMedia
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';

export const CreatePost: React.FC = () => {
  const [postType, setPostType] = useState<string>('public');
  const [description, setDescription] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      }
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => { /* navigate to userHomePage */ }}>
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

        {selectedImage && 
          <Box mt={2}>
            <Card>
              <CardMedia component="img" image={selectedImage} alt="Selected Preview" />
            </Card>
          </Box>
        }

        <Box mt={2}>
          <TextField
            fullWidth
            variant="outlined"
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Box>

        <Box mt={2}>
          <Select
            fullWidth
            variant="outlined"
            value={postType}
            onChange={e => setPostType(e.target.value as string)}
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
            onClick={() => {
              // Handle post submission logic here
            }}
          >
            Submit Post
          </Button>
        </Box>
      </Box>
    </div>
  );
};


