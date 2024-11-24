import React, { useEffect, useState } from "react";
import {
  CompanyMissionType,
  GalloGoalType,
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
// import { CategoryType } from "../CategorySelector";
// import { ChannelType } from "../ChannelSelector";
import "./reviewAndSubmit.css";
import { RootState } from "../../utils/store";
import { useSelector } from "react-redux";
import { fetchGoalsForAccount } from "../../utils/helperFunctions/fetchGoalsForAccount";
import {
  getGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import TotalCaseCount from "../TotalCaseCount";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";

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
  handlePostSubmission: any; // correct type?
  selectedCompanyMission: CompanyMissionType | undefined;
  selectedMission: MissionType | null;
  // selectedCategory: CategoryType;
  // selectedChannel: ChannelType; // correct type?
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

  useEffect(() => {
    if (companyId && apiKey === "") {
      const getApiKey = async () => {
        try {
          const fetchedApiKey = await fetchExternalApiKey(companyId, "galloApiKey");
          setApiKey(fetchedApiKey);
        } catch (error) {
          console.error("Failed to fetch API key:", error);
        }
      }
     getApiKey();
    }
  },[])

  return (
    <div className="review-and-submit">
      <button className="create-post-btn" onClick={onPrevious}>
        <h4>Back</h4>
      </button>

      {/* Selected Mission Information */}
      {selectedMission && (
        <Box mt={2}>
          <Typography variant="h6">
            Selected Mission: {selectedMission.missionTitle}
          </Typography>
        </Box>
      )}

      {/* Visibility Selection */}
      <Box mt={2}>
        {/* Visibility Section */}
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

      {/* Submit Button */}
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
              handlePostSubmission(
                post,
                selectedFile,
                setIsUploading,
                setUploadProgress,
                selectedCompanyMission,
                apiKey
              );
            }
          }}
        >
          {!isSubmitting ? "Submit Post" : "Processing..."}
        </Button>
      </Box>
    </div>
  );
};
