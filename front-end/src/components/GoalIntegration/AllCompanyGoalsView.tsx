import { useState, useMemo } from "react";
import {
  Typography,
  useMediaQuery,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";
import { CompanyGoalType, CompanyGoalWithIdType } from "../../utils/types";
import CompanyGoalCard from "./CompanyGoalCard";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { updateCompanyGoalInFirestore } from "../../thunks/companyGoalsThunk";
import { deleteCompanyGoalFromFirestore } from "../../utils/helperFunctions/deleteCompanyGoalFromFirestore";
import "./allCompanyGoalsView.css";
import ArchivedGoalsLayout from "./ArchivedGoals/ArchivedGoalsLayout";

const AllCompanyGoalsView = ({
  companyId,
}: {
  companyId: string | undefined;
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const companyGoals = useSelector(selectAllCompanyGoals);
  const [showArchived, setShowArchived] = useState(false); // this is unused now
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">(
    "newest"
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  // 🆕 Manage expanded card
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };

  // Split goals into active and archived
  const today = new Date().toISOString();
  const { activeGoals, archivedGoals } = useMemo(() => {
    const active = companyGoals.filter((goal) => goal.goalEndDate >= today);
    const archived = companyGoals.filter((goal) => goal.goalEndDate < today);
    return { activeGoals: active, archivedGoals: archived };
  }, [companyGoals, today]);

  // Sort goals
  const sortGoals = (goals: CompanyGoalWithIdType[]) => {
    return [...goals].sort((a, b) => {
      if (sortOrder === "newest") {
        return b.goalStartDate.localeCompare(a.goalStartDate);
      } else if (sortOrder === "oldest") {
        return a.goalStartDate.localeCompare(b.goalStartDate);
      } else if (sortOrder === "title") {
        return a.goalTitle.localeCompare(b.goalTitle);
      }
      return 0;
    });
  };

  const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSortSelect = (order: "newest" | "oldest" | "title") => {
    setSortOrder(order);
    setAnchorEl(null);
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

      {/* Sort Button */}
      <button onClick={handleSortClick} className="btn-outline">
        Sort:{" "}
        {sortOrder === "newest"
          ? "Newest First"
          : sortOrder === "oldest"
          ? "Oldest First"
          : "Title A-Z"}
      </button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleSortSelect("newest")}>
          Newest First
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect("oldest")}>
          Oldest First
        </MenuItem>
        <MenuItem onClick={() => handleSortSelect("title")}>Title A-Z</MenuItem>
      </Menu>

      {/* Active Goals */}
      <div className="goals-list">
        {sortGoals(activeGoals).map((goal) => (
          <CompanyGoalCard
            key={goal.id}
            goal={goal}
            mobile={isMobile}
            expanded={expandedGoalId === goal.id} // 👈 controlled
            onToggleExpand={handleToggleExpand} // 👈 controlled
            onDelete={() => {
              setSelectedGoalId(goal.id);
              setIsConfirmationOpen(true);
            }}
            onEdit={handleEditCompanyGoal}
          />
        ))}
      </div>

      {/* Toggle Archived Goals */}
      {archivedGoals.length > 0 && (
        <>
          {/* <button
            onClick={() => setShowArchived(!showArchived)}
            className="btn-outline"
          >
            {showArchived ? "Hide Archived Goals" : "Show Archived Goals"}
          </button> */}

          {/* {showArchived && (
            <div className="archived-goals-list">
              {sortGoals(archivedGoals).map((goal) => (
                <CompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  mobile={isMobile}
                  onDelete={() => {
                    setSelectedGoalId(goal.id);
                    setIsConfirmationOpen(true);
                  }}
                  onEdit={handleEditCompanyGoal}
                />
              ))}
            </div>
          )} */}
          {archivedGoals.length > 0 && (
            <ArchivedGoalsLayout
              archivedGoals={archivedGoals}
              isMobile={isMobile}
              onDelete={(goalId) => {
                setSelectedGoalId(goalId);
                setIsConfirmationOpen(true);
              }}
              onEdit={handleEditCompanyGoal}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
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
