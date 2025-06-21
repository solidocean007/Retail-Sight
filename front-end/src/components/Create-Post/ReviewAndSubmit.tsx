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
import { CompanyMissionType, MissionType, PostInputType } from "../../utils/types";

interface ReviewAndSubmitProps {
  companyId?: string;
  post: PostInputType;
  onPrevious: () => void;
  handleFieldChange: (
    field: keyof PostInputType,
    value: PostInputType[keyof PostInputType]
  ) => void;
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
  uploadProgress: number;
  selectedFile: File | null;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  handlePostSubmission: any;
  selectedCompanyMission?: CompanyMissionType;
  selectedMission: MissionType | null;
}

export const ReviewAndSubmit: React.FC<ReviewAndSubmitProps> = ({
  companyId,
  post,
  onPrevious,
  handleFieldChange,
  setIsUploading,
  uploadProgress,
  selectedFile,
  setUploadProgress,
  handlePostSubmission,
  selectedCompanyMission,
  selectedMission,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmitClick = useCallback(async () => {
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    setUploadProgress(0);        // reset bar at start
    setIsUploading(true);

    try {
      await handlePostSubmission(
        post,
        selectedFile,
        setIsUploading,
        setUploadProgress,
        selectedCompanyMission,
        apiKey,
        navigate
      );

      // only reach here if upload + Firestore writes succeeded
      dispatch(showMessage("Post submitted successfully!"));
      setUploadProgress(100);    // force 100% for UI
      setTimeout(() => {
        setIsUploading(false);
        navigate("/user-home-page");
      }, 800);
    } catch (error: any) {
      console.error("Error during post submission:", error);
      dispatch(
        showMessage(
          error.message || "An unknown error occurred during post submission."
        )
      );
      setUploadProgress(0);      // reset on failure
    } finally {
      setIsSubmitting(false);
      // no automatic reset here anymore :contentReference[oaicite:0]{index=0}
    }
  }, [
    apiKey,
    dispatch,
    handlePostSubmission,
    isSubmitting,
    navigate,
    post,
    selectedCompanyMission,
    selectedFile,
    setUploadProgress,
    setIsUploading,
  ]);

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
          type="button"
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

