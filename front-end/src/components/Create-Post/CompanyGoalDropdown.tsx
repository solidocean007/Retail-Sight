import React from "react";
import { Box, CircularProgress, MenuItem, Select } from "@mui/material";
import { CompanyGoalType } from "../../utils/types";

interface CompanyGoalDropdownProps {
  goals: CompanyGoalType[];
  label: string;
  loading: boolean;
  onSelect: (goal: CompanyGoalType | undefined) => void;
  selectedGoal?: CompanyGoalType;
}

const CompanyGoalDropdown: React.FC<CompanyGoalDropdownProps> = ({
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
      <Select
        fullWidth
        label={label}
        variant="outlined"
        value={selectedGoal?.id || ""}
        onChange={(e) => {
          const selected = goals.find((goal) => goal.id === e.target.value);
          onSelect(selected); // Pass the selected goal object
        }}
        displayEmpty
        disabled={goals.length === 0}
      >
        <MenuItem value="" disabled>
          {goals.length > 0
            ? `${goals.length} ${label} available`
            : `No ${label.toLowerCase()} available`}
        </MenuItem>
        {goals.map((goal) => (
          <MenuItem key={goal.id} value={goal.id}>
            {goal.goalDescription}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default CompanyGoalDropdown;


