import React from "react";
import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
} from "@mui/material";
import { FireStoreGalloGoalDocType } from "../../utils/types";

interface GalloGoalDropdownProps {
  goals: FireStoreGalloGoalDocType[];
  label: string;
  loading: boolean;
  onSelect: (goal: FireStoreGalloGoalDocType | undefined) => void;
  selectedGoal?: string | null;
}

const GalloGoalDropdown: React.FC<GalloGoalDropdownProps> = ({
  goals,
  label,
  loading,
  onSelect,
  selectedGoal,
}) => {
  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Box mt={2}>
        <Select
          fullWidth
          variant="outlined"
          value={selectedGoal || "no-goal"}
          onChange={(e) => {
            const goal = goals.find(
              (g) => g.goalDetails.goalId === e.target.value
            );
            onSelect(goal); // 🆕 Pass the full goal object
          }}
          displayEmpty
          disabled={goals.length === 0}
        >
          <MenuItem value="no-goal">
            {goals.length > 0
              ? `${goals.length} ${label} available`
              : `No ${label.toLowerCase()} available`}
          </MenuItem>
          {goals.map((goal) => (
            <MenuItem
              key={goal.goalDetails.goalId}
              value={goal.goalDetails.goalId}
            >
              {goal.goalDetails.goal}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};


export default GalloGoalDropdown;
