import React from "react";
import { PostType } from "../utils/types";
import { Box, Button, MenuItem, Select } from "@mui/material";
import { CategoryType } from "./CategorySelector";
import { ChannelType } from "./ChannelSelector";

interface ReviewAndSubmitProps {
  post: PostType;
  onPrevious: () => void;
  handleFieldChange: (field: keyof PostType, value: PostType[keyof PostType]) => void;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFile: File | null;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  handlePostSubmission: any;
  selectedCategory: CategoryType;
  selectedChannel: ChannelType; // correct type?

}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  post,
  onPrevious,
  handleFieldChange,
  setIsUploading,
  selectedFile,
  setUploadProgress,
  handlePostSubmission,
  selectedCategory,
  selectedChannel,
}) => {

  
  return (
    <div className="review-and-submit">
      <Button onClick={onPrevious}>
        <h4>Back</h4>
      </Button>
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
                setUploadProgress
              );
            } else {
              // Handle the situation where selectedFile is null
            }
          }}
        >
          Submit Post
        </Button>
      </Box>
      <Button>
        <h4>Submit</h4>
      </Button>
    </div>
  );
};
