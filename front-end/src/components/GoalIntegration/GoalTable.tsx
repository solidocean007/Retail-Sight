import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { GalloGoalType } from "../../utils/types";
import "./goalTable.css";

interface GoalTableProps {
  goals: GalloGoalType[];
  selectedGoal: GalloGoalType | null;
  onSelectGoal: (goal: GalloGoalType | null) => void;

  canContinue: boolean;
  isLoading: boolean;
  onContinue: () => void;
}

const GoalTable: React.FC<GoalTableProps> = ({
  goals,
  selectedGoal,
  onSelectGoal,
  canContinue,
  isLoading,
  onContinue,
}) => {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (goals.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No goals available for this program.
      </Typography>
    );
  }

  /* ---------------------------
     MOBILE CARD VIEW
  ---------------------------- */
  if (isMobile) {
    return (
      <div className="goal-list">
        <Typography variant="h6" sx={{ mb: 1 }}>
          Goals for Selected Program
        </Typography>

        {goals.map((goal) => {
          const selected = selectedGoal?.goalId === goal.goalId;

          return (
            <div
              key={goal.goalId}
              className={`goal-card ${selected ? "selected" : ""}`}
              onClick={() =>
                selected ? onSelectGoal(null) : onSelectGoal(goal)
              }
            >
              <div className="goal-card-header">
                <Checkbox checked={selected} />
                <span className="goal-title">{goal.goal}</span>
              </div>

              <div className="goal-meta">
                <div>
                  <strong>Metric</strong>
                  <span>{goal.goalMetric}</span>
                </div>
                <div>
                  <strong>Min Value</strong>
                  <span>{goal.goalValueMin}</span>
                </div>
              </div>
            </div>
          );
        })}

        <button
          className="button-primary gallo-program-action"
          disabled={!canContinue || isLoading}
          onClick={onContinue}
        >
          {isLoading ? "Fetching…" : "Fetch Accounts"}
        </button>
      </div>
    );
  }

  /* ---------------------------
     DESKTOP TABLE VIEW
  ---------------------------- */
  return (
    <div className="goal-list">
      <TableContainer>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Goal for Selected Program
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={60}>Select</TableCell>
              <TableCell>Goal</TableCell>
              <TableCell>Metric</TableCell>
              <TableCell>Min Value</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {goals.map((goal) => {
              const selected = selectedGoal?.goalId === goal.goalId;

              return (
                <TableRow
                  key={goal.goalId}
                  hover
                  selected={selected}
                  onClick={() =>
                    selected ? onSelectGoal(null) : onSelectGoal(goal)
                  }
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Checkbox checked={selected} />
                  </TableCell>
                  <TableCell>{goal.goal}</TableCell>
                  <TableCell>{goal.goalMetric}</TableCell>
                  <TableCell>{goal.goalValueMin}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="goal-table-actions">
          <button
            className="button-primary"
            disabled={!canContinue || isLoading}
            onClick={onContinue}
          >
            {isLoading ? "Fetching…" : "Fetch Accounts"}
          </button>
        </div>
      </TableContainer>
    </div>
  );
};

export default GoalTable;
