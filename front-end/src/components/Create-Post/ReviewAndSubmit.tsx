import React, { useState } from "react";
import { PostType } from "../../utils/types";
import { Box, Button, MenuItem, Select } from "@mui/material";
// import { CategoryType } from "../CategorySelector";
// import { ChannelType } from "../ChannelSelector";
import './reviewAndSubmit.css'

interface ReviewAndSubmitProps {
  post: PostType;
  onPrevious: () => void;
  handleFieldChange: (field: keyof PostType, value: PostType[keyof PostType]) => void;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedFile: File | null;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  handlePostSubmission: any; // correct type?
  // selectedCategory: CategoryType;
  // selectedChannel: ChannelType; // correct type?

}


export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  post,
  onPrevious,
  handleFieldChange,
  setIsUploading,
  selectedFile,
  setUploadProgress,
  handlePostSubmission,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  return (
    <div className="review-and-submit">
      <button className="create-post-btn" onClick={onPrevious}>
        <h4>Back</h4>
      </button>
      <Box mt={2}>
        <Select
          fullWidth
          variant="outlined"
          value={post.visibility}
          onChange={(e) => handleFieldChange("visibility", e.target.value)}
        >
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="company">Company only</MenuItem>
          <MenuItem value="supplier">Objective</MenuItem>
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
          disabled={isSubmitting}
          onClick={() => {
            if (selectedFile && !isSubmitting) {
              setIsSubmitting(true);
              setIsUploading(true);
              // Pass the current post state directly
              handlePostSubmission(
                post,
                selectedFile,
                setIsUploading,
                setUploadProgress
              );
            } else {
              // Handle the situation where selectedFile is null
            }
          }}
        >
          {!isSubmitting ? 'Submit Post': 'Processing...'}
        </Button>
      </Box>
      
    </div>
  );
};
