// ReviewAndSubmit.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
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
} from "../../utils/types";
import { mergeAndSetPosts } from "../../Slices/postsSlice";
import { normalizePost } from "../../utils/normalizePost";
import LoadingIndicator from "./LoadingIndicator";

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
  selectedGalloGoal,
}) => {
  const [apiKey, setApiKey] = useState("");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [uploadStatusText, setUploadStatusText] = useState("");

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

  // const handleSubmitClick = useCallback(async () => {
  //   if (!selectedFile || isSubmitting) return;

  //   setIsSubmitting(true);
  //   setUploadProgress(0);        // reset bar at start
  //   setIsUploading(true);

  //   try {
  //     await handlePostSubmission(
  //       post,
  //       selectedFile,
  //       setIsUploading,
  //       setUploadProgress,
  //       selectedCompanyMission,
  //       apiKey,
  //       navigate
  //     );

  //     // only reach here if upload + Firestore writes succeeded
  //     dispatch(showMessage("Post submitted successfully!"));
  //     setUploadProgress(100);    // force 100% for UI
  //     setTimeout(() => {
  //       setIsUploading(false);
  //       navigate("/user-home-page");
  //     }, 800);
  //   } catch (error: any) {
  //     console.error("Error during post submission:", error);
  //     dispatch(
  //       showMessage(
  //         error.message || "An unknown error occurred during post submission."
  //       )
  //     );
  //     setUploadProgress(0);      // reset on failure
  //   } finally {
  //     setIsSubmitting(false);
  //     // no automatic reset here anymore :contentReference[oaicite:0]{index=0}
  //   }
  // }, [
  //   apiKey,
  //   dispatch,
  //   handlePostSubmission,
  //   isSubmitting,
  //   navigate,
  //   post,
  //   selectedCompanyMission,
  //   selectedFile,
  //   setUploadProgress,
  //   setIsUploading,
  // ]);

  // ReviewAndSubmit.tsx
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
        setUploadStatusText,
        apiKey,
        selectedGalloGoal
      );
      dispatch(mergeAndSetPosts([normalizePost(newPost)]));
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
          disabled={isUploading}
          onClick={handleSubmitClick}
        >
          {isUploading
            ? `Uploading ${Math.round(uploadProgress)}%`
            : "Submit Post"}
        </Button>
      </Box>
      <Backdrop
        open={isUploading}
        sx={{ color: "#fff", zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Box textAlign="center">
          <Typography variant="h6" sx={{ mb: 2 }}>
            {uploadStatusText}
          </Typography>
          <LoadingIndicator progress={uploadProgress} />
          <Typography variant="body2" sx={{ mt: 2, fontWeight: "bold" }}>
            {Math.round(uploadProgress)}%
          </Typography>
        </Box>
      </Backdrop>
    </div>
  );
};
