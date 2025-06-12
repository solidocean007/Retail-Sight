import React, { useEffect, useState } from "react";
import { CompanyMissionType, MissionType, PostInputType } from "../../utils/types";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useAppDispatch } from "../../utils/store";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import { showMessage } from "../../Slices/snackbarSlice";
import { useNavigate } from "react-router-dom";

interface ReviewAndSubmitProps {
  companyId: string | undefined;
  post: PostInputType;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType],
  ) => void;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  selectedFile: File | null;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  handlePostSubmission: any;
  selectedCompanyMission: CompanyMissionType | undefined;
  selectedMission: MissionType | null;
}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  companyId,
  post,
  onPrevious,
  handleFieldChange,
  setIsUploading,
  selectedFile,
  uploadProgress,
  setUploadProgress,
  handlePostSubmission,
  selectedCompanyMission,
  selectedMission,
}) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (post.oppId && companyId && apiKey === "") {
      const fetchApiKey = async () => {
        try {
          const fetchedApiKey = await fetchExternalApiKey(
            companyId,
            "galloApiKey",
          );
          setApiKey(fetchedApiKey);
        } catch (error) {
          console.error("Failed to fetch API key:", error);
          dispatch(showMessage("Failed to fetch API key."));
        }
      };
      fetchApiKey();
    }
  }, [companyId, apiKey, dispatch]);

  console.log('post to submit: ', post)

  const handleSubmitClick = async () => {
    if (!selectedFile || isSubmitting) return; // Prevent multiple submissions

    setIsSubmitting(true); // Set submitting to true when submission starts

    try {
      // Call the post submission logic
      await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        selectedCompanyMission,
        apiKey,
        navigate,
      );

      if (uploadProgress === 100) {
        // Ensure the upload has completed before proceeding
        dispatch(showMessage("Post submitted successfully!"));
      }
    } catch (error: any) {
      console.error("Error during post submission:", error);
      navigate("/user-home-page");
      // Show appropriate error message
      dispatch(
        showMessage(
          error.message || "An unknown error occurred during post submission.",
        ),
      );
    } finally {
      setIsSubmitting(false); // Reset submitting state
      if (uploadProgress === 100) {
        setTimeout(() => {
          setIsUploading(false); // Hide loading indicator after completion
          navigate("/user-home-page");
        }, 1000); // Short delay for smoother UX
      } else {
        console.warn("Upload progress did not reach 100%; resetting.");
        setUploadProgress(0); // Reset progress only if not fully uploaded
      }
    }
  };

  return (
    <div className="review-and-submit">
      <button className="create-post-btn" onClick={onPrevious}>
        <h4>Back</h4>
      </button>

      {selectedMission && (
        <Box mt={2}>
          <Typography variant="h6">
            Selected Mission: {selectedMission.missionTitle}
          </Typography>
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="h6">Post Visibility</Typography>
        <Select
          fullWidth
          variant="outlined"
          value={post.visibility || "public"}
          onChange={(e) => handleFieldChange("visibility", e.target.value)}
        >
          <MenuItem value="public">Public</MenuItem>
          <MenuItem value="company">Company Only</MenuItem>
        </Select>
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          type="submit"
          fullWidth
          disabled={isSubmitting}
          onClick={handleSubmitClick}
        >
          {!isSubmitting ? "Submit Post" : <CircularProgress size={44} />}
        </Button>
      </Box>
    </div>
  );
};
