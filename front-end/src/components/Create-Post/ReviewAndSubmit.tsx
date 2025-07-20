// ReviewAndSubmit.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import { useNavigate } from "react-router-dom";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import {
  CompanyMissionType,
  FireStoreGalloGoalDocType,
  MissionType,
  PostInputType,
  VisibilityType,
} from "../../utils/types";
import { mergeAndSetPosts } from "../../Slices/postsSlice";
import { normalizePost } from "../../utils/normalizePost";
import { DisplayDescription } from "./DisplayDescription";

interface ReviewAndSubmitProps {
  companyId?: string;
  post: PostInputType;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType]
  ) => void;
  isUploading: boolean;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  selectedFile: File | null;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  handlePostSubmission: any;
  selectedCompanyMission?: CompanyMissionType;
  selectedGalloGoal?: FireStoreGalloGoalDocType | null;
}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  companyId,
  post,
  onPrevious,
  handleFieldChange,
  isUploading,
  setIsUploading,
  uploadProgress,
  selectedFile,
  setUploadProgress,
  handlePostSubmission,
  selectedCompanyMission,
  selectedGalloGoal,
}) => {
  const [apiKey, setApiKey] = useState("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // load external API key once
  useEffect(() => {
    if (post.oppId && companyId && !apiKey) {
      fetchExternalApiKey(companyId, "galloApiKey")
        .then((key) => setApiKey(key))
        .catch(() => {
          console.error("Failed to fetch API key");
          dispatch(showMessage("Failed to fetch API key."));
        });
    }
  }, [companyId, post.oppId, apiKey, dispatch]);

  const handleSubmitClick = async () => {
    if (!selectedFile) {
      dispatch(showMessage("Please select an image before submitting."));
      return;
    }

    // setIsSubmitting(true);
    setUploadProgress(0);
    setIsUploading(true);

    try {
      const newPost = await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        selectedCompanyMission,
        apiKey,
        navigate,
        selectedGalloGoal
      );
      dispatch(mergeAndSetPosts([normalizePost(newPost)]));
      dispatch(showMessage("Post submitted successfully!"));
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(err.message || "An error occurred during upload.");
    } finally {
      navigate("/user-home-page");
    }
  };

  return (
    <div className="review-and-submit">
      <button className="create-post-btn" onClick={onPrevious}>
        <h4>Back</h4>
      </button>

      <Box mt={2}>
        <Typography variant="h6">Post Visibility</Typography>
        <Select
          fullWidth
          variant="outlined"
          value={post.visibility || "network"}
          onChange={(e) =>
            handleFieldChange("visibility", e.target.value as VisibilityType)
          }
        >
          <MenuItem value="network">Network</MenuItem>
          <MenuItem value="companyOnly">Company Only</MenuItem>
        </Select>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          type="button"
          fullWidth
          disabled={isUploading}
          onClick={handleSubmitClick}
        >
          {isUploading
            ? `Uploading ${Math.round(uploadProgress)}%`
            : "Submit Post"}
        </Button>
        {/* <DisplayDescription
          post={post}
          onNext={() => {}}
          onPrevious={onPrevious}
          handleFieldChange={handleFieldChange}
        /> */}
      </Box>
    </div>
  );
};
