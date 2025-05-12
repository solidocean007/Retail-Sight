import React from "react";
import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { FireStoreGalloGoalDocType } from "../../utils/types";

interface GalloGoalDropdownProps {
  goals: FireStoreGalloGoalDocType[];
  label: string;
  loading: boolean;
  onSelect: (goalId: string) => void;
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
          onChange={(e) => onSelect(e.target.value)}
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
