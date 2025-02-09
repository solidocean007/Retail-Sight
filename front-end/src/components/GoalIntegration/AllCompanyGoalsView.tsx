import React, { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CompanyAccountType, GoalSubmission } from "../../utils/types";
import { selectAllCompanyGoals } from "../../Slices/goalsSlice";
import { useSelector } from "react-redux";
import { deleteCompanyGoalFromFirestore } from "../../utils/helperFunctions/deleteCompanyGoalFromFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";
import { useNavigate } from "react-router-dom";
import "./allCompanyGoalsView.css";

const AllCompanyGoalsView = ({
  companyId,
}: {
  companyId: string | undefined;
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);
  const companyGoals = useSelector(selectAllCompanyGoals);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prevExpanded) =>
      prevExpanded.includes(goalId)
        ? prevExpanded.filter((id) => id !== goalId)
        : [...prevExpanded, goalId]
    );
  };

  const openConfirmationDialog = (programId: string) => {
    setSelectedGoalId(programId);
    setIsConfirmationOpen(true);
  };

  const handleDeleteCompanyGoal = async (goalId: string) => {
    try {
      await deleteCompanyGoalFromFirestore(goalId);
      dispatch(showMessage("Goal deleted successfully."));
    } catch (error) {
      console.error("Error deleting goal:", error);
      dispatch(showMessage("Failed to delete goal. Please try again."));
    }
  };

  return (
    <div className="all-company-goals-container">
      <Typography
        variant={isMobile ? "h6" : "h4"}
        gutterBottom
        className="company-goals-header"
      >
        Company Goals
      </Typography>
      <Box className="goals-container">
        {companyGoals.map((goal, index) => (
          <Box
            key={index}
            className={`goal-box ${isMobile ? "goal-box-mobile" : ""}`}
          >
            <Box className="goal-row">
              <Typography className="goal-label">Goal Title:</Typography>
              <Typography className="goal-value">{goal.goalTitle}</Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">Description:</Typography>
              <Typography className="goal-value">
                {goal.goalDescription}
              </Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">Metric:</Typography>
              <Typography className="goal-value">
                {goal.goalMetric || "N/A"}
              </Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">Start:</Typography>
              <Typography className="goal-value">{goal.goalStartDate}</Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">End:</Typography>
              <Typography className="goal-value">{goal.goalEndDate}</Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">Accounts:</Typography>
              <Typography className="goal-value">
                {Array.isArray(goal.accounts) && goal.accounts.length > 0 ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => toggleGoalExpansion(goal.id)}
                  >
                    {expandedGoals.includes(goal.id) ? "Collapse" : "Show"}
                  </Button>
                ) : (
                  "All Accounts"
                )}
              </Typography>
            </Box>
            <Box className="goal-row">
              <Typography className="goal-label">Actions:</Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => openConfirmationDialog(goal.id)}
                size={isMobile ? "small" : "medium"}
              >
                Delete
              </Button>
            </Box>

            {expandedGoals.includes(goal.id) && (
              <Collapse
                in={expandedGoals.includes(goal.id)}
                timeout="auto"
                unmountOnExit
              >
                <Box margin={1} className="expanded-details">
                  {goal.accounts?.map((account: CompanyAccountType) => (
                    <Box key={account.accountNumber} className="expanded-row">
                      <Typography>{account.accountName || "N/A"}</Typography>
                      <Typography>{account.accountAddress || "N/A"}</Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            )}
          </Box>
        ))}
      </Box>
      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => handleDeleteCompanyGoal(selectedGoalId)}
        message="Are you sure you want to delete this goal?"
      />
    </div>
  );
};

export default AllCompanyGoalsView;

