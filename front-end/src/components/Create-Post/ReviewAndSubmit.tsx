import React, { useEffect, useState } from "react";
import {
  CompanyMissionType,
  MissionType,
  PostType,
} from "../../utils/types";
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
  post: PostType;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostType,
    value: PostType[keyof PostType]
  ) => void;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
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
    if (companyId && apiKey === "") {
      const fetchApiKey = async () => {
        try {
          const fetchedApiKey = await fetchExternalApiKey(companyId, "galloApiKey");
          setApiKey(fetchedApiKey);
        } catch (error) {
          console.error("Failed to fetch API key:", error);
          dispatch(showMessage("Failed to fetch API key."));
        }
      };
      fetchApiKey();
    }
  }, [companyId, apiKey, dispatch]);

  const handleSubmitClick = async () => {
    if (!selectedFile || isSubmitting) return;
  
    setIsSubmitting(true);
    setIsUploading(true);
  
    try {
      await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        selectedCompanyMission,
        apiKey
      );
  
      dispatch(showMessage("Post submitted successfully!"));
    } catch (error: any) {
      console.error("Error during post submission:", error);
  
      if (error.message === "Achievement already sent") {
        // Specific handling for non-critical error
        dispatch(showMessage("Achievement already sent!"));
      } else {
        dispatch(
          showMessage(
            error.message || "An unknown error occurred during post submission."
          )
        );
      }
  
      setUploadProgress(0); // Reset progress
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
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
          {!isSubmitting ? "Submit Post" : <CircularProgress size={24} />}
        </Button>
      </Box>
    </div>
  );
};


