// GoalTable.tsx
import React from 'react';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Typography } from "@mui/material";
import { GoalType } from "../../utils/types";

interface GoalTableProps {
  goals: GoalType[];
}

const GoalTable: React.FC<GoalTableProps> = ({ goals }) => {
  return (
    <TableContainer>
      <Typography variant="h6">Goals for Selected Programs</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Goal</TableCell>
            <TableCell>Goal Metric</TableCell>
            <TableCell>Goal Value Min</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {goals.map((goal) => (
            <TableRow key={goal.goalId}>
              <TableCell>{goal.goal}</TableCell>
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
