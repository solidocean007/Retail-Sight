// GoalTable.tsx
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
} from "@mui/material";
import { GoalType } from "../../utils/types";

interface GoalTableProps {
  goals: GoalType[];
  selectedGoal: GoalType | null;
  onSelectGoal: (goal: GoalType) => void;
}

const GoalTable: React.FC<GoalTableProps> = ({ goals, selectedGoal, onSelectGoal }) => {
  return (
    <TableContainer>
      <Typography variant="h6">Goals for Selected Program</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Goal</TableCell>
            <TableCell>Program #</TableCell>
            <TableCell>Goal Metric</TableCell>
            <TableCell>Goal Value Min</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {goals.map((goal) => (
            <TableRow key={goal.goalId}>
              <TableCell>
                <Checkbox
                  checked={selectedGoal?.goalId === goal.goalId}
                  onChange={() => onSelectGoal(goal)}
                />
              </TableCell>
              <TableCell>{goal.goal}</TableCell>
              <TableCell>{goal.programId}</TableCell>
              <TableCell>{goal.goalMetric}</TableCell>
              <TableCell>{goal.goalValueMin}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default GoalTable;

