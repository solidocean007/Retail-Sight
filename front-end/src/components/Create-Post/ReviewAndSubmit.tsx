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
  const [goalForAccount, setGoalForAccount] = useState<GalloGoalType | null>(
    null
  );
  const [isFetchingGoal, setIsFetchingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const userAccounts = useSelector(
    (state: RootState) => state.userAccounts.accounts
  );
  const [goalMetric, setGoalMetric] = useState("cases");

  useEffect(() => {
    if (post.accountNumber) {
      handleFetchGoal();
      if (goalForAccount) {
        const metric = goalForAccount.goalDetails.goalMetric;
        setGoalMetric(metric);
      }
    }
  }, [post.accountNumber]);

  // Fetch goal for the current account
  const handleFetchGoal = async () => {
    if (post.accountNumber) {
      const savedGoals = await getGoalsFromIndexedDB();
      const goalForAccount = savedGoals.find((goal) =>
        goal.accounts.some(
          (acc) => acc.distributorAcctId === post.accountNumber
        )
      );

      if (!goalForAccount) {
        const fetchedGoals = await fetchGoalsForAccount(post.accountNumber); // Now returns an array
        if (fetchedGoals.length > 0) {
          await saveGoalsToIndexedDB(fetchedGoals); // Save all fetched goals
          setGoalForAccount(fetchedGoals[0]); // Set the first goal if found
        } else {
          console.warn("No goals fetched for this account.");
        }
      } else {
        setGoalForAccount(goalForAccount);
      }
    }
  };

  const handleGoalSelection = async (goalId: string) => {
    // Fetch the API key after a goal is selected
    if (companyId && apiKey === "") {
      try {
        const fetchedApiKey = await fetchExternalApiKey(companyId, "galloApiKey");
        setApiKey(fetchedApiKey);
      } catch (error) {
        console.error("Failed to fetch API key:", error);
      }
    }
  
    if (goalId === "no-goal") {
      // Clear all fields if no goal is selected
      handleFieldChange("oppId", ""); 
      handleFieldChange("closedUnits", 0);
      handleFieldChange("closedDate", ""); 
    } else if (goalForAccount) {
      // Ensure we correctly access the oppId within the accounts array
      const matchingAccount = goalForAccount.accounts.find(
        (account) => account.distributorAcctId === post.accountNumber
      );
  
      if (matchingAccount) {
        const selectedGoal = goalForAccount.goalDetails;
        const goalMetric = selectedGoal.goalMetric.toLowerCase();
        const defaultClosedUnits =
          goalMetric === "bottles" ? 6 : selectedGoal.goalValueMin;
  
        handleFieldChange(
          "totalCaseCount",
          goalMetric === "cases" ? defaultClosedUnits : 0
        );
        handleFieldChange("closedUnits", defaultClosedUnits);
        handleFieldChange("oppId", matchingAccount.oppId); // Correctly set oppId
        handleFieldChange(
          "closedDate",
          new Date().toISOString().split("T")[0] // Format: YYYY-MM-DD
        );
        handleFieldChange("closedBy", post.postUserName || "");
      } else {
        console.warn("No matching account found for the selected goal.");
      }
    }
  
    setSelectedGoalId(goalId); // Update the selected goal ID
  };
  
  console.log(goalForAccount, ": goal for account");
  console.log(post);

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

      <Box mt={2}>
        {/* Goal Section */}
        <Typography variant="h6">Gallo Goal</Typography>
        {isFetchingGoal ? (
          <CircularProgress />
        ) : (
          <>
            <Select
              fullWidth
              variant="outlined"
              value={selectedGoalId || "no-goal"}
              onChange={(e) => handleGoalSelection(e.target.value)}
              displayEmpty
              renderValue={(value) => {
                if (value === "no-goal") {
                  return "No goal selected for this display";
                }
                const selectedGoal = goalForAccount?.goalDetails.goal;
                return `${selectedGoal} (Metric: ${goalForAccount?.goalDetails.goalMetric})`;
              }}
            >
              <MenuItem value="no-goal">
                No goal selected for this display
              </MenuItem>
              {goalForAccount && (
                <MenuItem value={goalForAccount.goalDetails.goalId}>
                  {`${goalForAccount.goalDetails.goal} - ${goalForAccount.accounts[0].accountName}`}
                </MenuItem>
              )}
            </Select>
            <Button
              variant="contained"
              color="primary"
              onClick={handleFetchGoal}
              disabled={!!goalForAccount || isFetchingGoal}
              sx={{ mt: 1 }}
            >
              Fetch Goal for This Account
            </Button>
          </>
        )}
      </Box>

      <Box mt={2}>
        {/* Total Case Count */}
        <Typography variant="h6">{`Total ${goalMetric} Count`}</Typography>
        <TotalCaseCount
          handleTotalCaseCountChange={(value) =>
            handleFieldChange("totalCaseCount", value)
          }
        />
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
