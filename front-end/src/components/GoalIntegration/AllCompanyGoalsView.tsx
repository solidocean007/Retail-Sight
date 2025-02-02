import React, { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import { selectAllCompanyGoals } from "../../Slices/goalsSlice";
import { useSelector } from "react-redux";
import { deleteCompanyGoalFromFirestore } from "../../utils/helperFunctions/deleteCompanyGoalFromFirestore";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import CustomConfirmation from "../CustomConfirmation";
import { useNavigate } from "react-router-dom";

const AllCompanyGoalsView = (companyId: string) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Company Goals
      </Typography>
      <TableContainer>
        <Table className="table">
          <TableHead>
            <TableRow>
              <TableCell>Goal Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Metric</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Accounts</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companyGoals.map((goal, index) => (
              <React.Fragment key={index}>
                <TableRow className="goal-row">
                  <TableCell>{goal.goalTitle}</TableCell>
                  <TableCell>{goal.goalDescription}</TableCell>
                  <TableCell>{goal.goalMetric || "N/A"}</TableCell>
                  <TableCell>{goal.goalStartDate}</TableCell>
                  <TableCell>{goal.goalEndDate}</TableCell>
                  <TableCell>
                    {Array.isArray(goal.accounts) &&
                    goal.accounts.length > 0 ? (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => toggleGoalExpansion(goal.id)}
                      >
                        {expandedGoals.includes(goal.id)
                          ? "Collapse"
                          : "Show Accounts"}
                      </Button>
                    ) : (
                      <Typography>All Accounts</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => openConfirmationDialog(goal.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>

                {expandedGoals.includes(goal.id) && (
                  <TableRow>
                    <TableCell colSpan={7} className="accounts-table">
                      <Collapse
                        in={expandedGoals.includes(goal.id)}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box margin={1}>
                          {typeof goal.accounts === "string" ? (
                            <Typography>
                              Global: Available for all accounts
                            </Typography>
                          ) : (
                            <Table size="small" className="spreadsheet-table">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Account Name</TableCell>
                                  <TableCell>Account Address</TableCell>
                                  <TableCell>Post</TableCell>{" "}
                                  {/* Merged "Post Status" & "Actions" */}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {goal.accounts.map(
                                  (account: CompanyAccountType) => {
                                    const hasSubmittedPosts =
                                      Array.isArray(goal.submittedPostsIds) &&
                                      goal.submittedPostsIds.length > 0;

                                    return (
                                      <TableRow
                                        key={account.accountNumber}
                                        className="account-row"
                                        sx={
                                          hasSubmittedPosts
                                            ? {
                                                backgroundColor: "green",
                                                color: "white",
                                              }
                                            : {}
                                        }
                                      >
                                        <TableCell>
                                          {account.accountName || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                          {account.accountAddress || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                          {hasSubmittedPosts ? (
                                            goal.submittedPostsIds?.map(
                                              (postId, index) => (
                                                <Button
                                                  key={postId}
                                                  variant="contained"
                                                  color="secondary"
                                                  size="small"
                                                  sx={{
                                                    color: "white",
                                                    backgroundColor:
                                                      "darkgreen",
                                                    "&:hover": {
                                                      backgroundColor: "green",
                                                    },
                                                  }}
                                                  onClick={() =>
                                                    navigate(
                                                      `/user-home-page?postId=${postId}`
                                                    )
                                                  }
                                                >
                                                  View Post {index + 1}
                                                </Button>
                                              )
                                            )
                                          ) : (
                                            <Typography color="error">
                                              None
                                            </Typography>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  }
                                )}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => handleDeleteCompanyGoal(selectedGoalId)}
        message="Are you sure you want to delete this goal?"
      />
    </Box>
  );
};

export default AllCompanyGoalsView;
