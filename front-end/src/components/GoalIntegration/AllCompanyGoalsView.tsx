import { useState } from "react";
import { Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  selectAllCompanyGoals,
  updateCompanyGoalInFirestore,
} from "../../Slices/goalsSlice";
import { useSelector } from "react-redux";
import { deleteCompanyGoalFromFirestore } from "../../utils/helperFunctions/deleteCompanyGoalFromFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";
import { useNavigate } from "react-router-dom";
import "./allCompanyGoalsView.css";
import CompanyGoalDetailsCard from "./CompanyGoalDetailsCard";
import { CompanyGoalType } from "../../utils/types";

const AllCompanyGoalsView = ({
  companyId,
}: {
  companyId: string | undefined;
}) => {
  const dispatch = useAppDispatch();
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
      setIsConfirmationOpen(false);
    } catch (error) {
      console.error("Error deleting goal:", error);
      dispatch(showMessage("Failed to delete goal. Please try again."));
    }
  };

  const handleEditCompanyGoal = async (
    goalId: string,
    updatedFields: Partial<CompanyGoalType>
  ) => {
    try {
      await dispatch(
        updateCompanyGoalInFirestore({ goalId, updatedFields })
      ).unwrap();
      dispatch(showMessage("Goal updated successfully."));
    } catch (error) {
      console.error("Error updating goal:", error);
      dispatch(showMessage("Failed to update goal. Please try again."));
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

      {/* List of Goals */}
      <div className="goals-list">
        {companyGoals.map((goal, index: number) => {
          // Normalize accounts for rendering

          return (
            <CompanyGoalDetailsCard
              key={goal.id}
              goal={goal}
              mobile={isMobile}
              onDelete={openConfirmationDialog}
              onEdit={(goalId, updatedFields) => handleEditCompanyGoal(goalId, updatedFields)}
            />
          );
        })}
      </div>
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
