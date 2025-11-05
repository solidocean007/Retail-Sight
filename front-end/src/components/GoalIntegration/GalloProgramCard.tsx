// ProgramCard.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Collapse,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import "./gallo-goals.css";

interface ProgramCardProps {
  program: any; // Replace with proper type if available
  employeeMap: Record<string, string>;
  onViewPostModal: (id:string) => void;
}

const GalloProgramCard: React.FC<ProgramCardProps> = ({
  program,
  employeeMap,
  onViewPostModal,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    {}
  );

  const handleViewGoalPost = (postId: string) => {
    console.log("👀 Gallo View button clicked", postId);
    onViewPostModal(postId);
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  return (
    <Paper elevation={3} className="program-card">
      <Box className="program-header">
        <Box>
          <Typography variant="h6" className="program-title">
            {program.programTitle}
          </Typography>
          <Typography variant="body2" className="program-dates">
            {program.programStartDate} - {program.programEndDate}
          </Typography>
        </Box>
        <Button
          onClick={() => setExpanded(!expanded)}
          variant="outlined"
          size="small"
          className="toggle-btn"
        >
          {expanded ? "Close" : "Open"}
        </Button>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {program.goals.map((goal: any) => (
          <Box key={goal.goalDetails.goalId} className="goal-container">
            <Typography variant="subtitle1" className="goal-title">
              Goal: {goal.goalDetails.goal}
            </Typography>
            <Typography variant="body2" className="goal-metrics">
              Metric: {goal.goalDetails.goalMetric} | Min Value:{" "}
              {goal.goalDetails.goalValueMin}
            </Typography>

            <Button
              onClick={() => toggleGoalExpansion(goal.goalDetails.goalId)}
              variant="outlined"
              size="small"
              className="toggle-btn"
            >
              {expandedGoals[goal.goalDetails.goalId]
                ? "Hide Accounts"
                : "Show Accounts"}
            </Button>

            <Collapse
              in={expandedGoals[goal.goalDetails.goalId]}
              timeout="auto"
              unmountOnExit
            >
              <Box mt={2}>
                <Table size="small" className="accounts-table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Account Name</TableCell>
                      <TableCell>Account Address</TableCell>
                      <TableCell>Sales Route #</TableCell>
                      <TableCell>Salesperson</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {goal.accounts.map((account: any, idx: number) => (
                      <TableRow key={idx} className="account-row">
                        <TableCell data-label="Account Name">
                          {account.accountName || "N/A"}
                        </TableCell>
                        <TableCell data-label="Account Address">
                          {account.accountAddress || "N/A"}
                        </TableCell>
                        <TableCell data-label="Sales Route #">
                          {Array.isArray(account.salesRouteNums)
                            ? account.salesRouteNums.join(", ")
                            : account.salesRouteNums || "N/A"}
                        </TableCell>
                        <TableCell data-label="Salesperson">
                          {Array.isArray(account.salesRouteNums)
                            ? employeeMap[account.salesRouteNums[0]] ||
                              "Unknown"
                            : employeeMap[account.salesRouteNums] || "Unknown"}
                        </TableCell>
                        <TableCell data-label="Status">
                          {account.submittedPostId ? (
                            <button
                              onClick={() =>
                                handleViewGoalPost(account.submittedPostId)
                              }
                            >
                              View
                            </button>
                          ) : (
                            <Typography className="not-submitted-status">
                              Not Submitted
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </Box>
        ))}
      </Collapse>
    </Paper>
  );
};

export default GalloProgramCard;
