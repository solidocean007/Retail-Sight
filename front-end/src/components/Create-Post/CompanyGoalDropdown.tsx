import React from "react";
import { Box, CircularProgress, MenuItem, Select } from "@mui/material";
import { CompanyGoalType, CompanyGoalWithIdType } from "../../utils/types";

interface CompanyGoalDropdownProps {
  goals: CompanyGoalWithIdType[];
  label: string;
  loading: boolean;
  onSelect: (goal: CompanyGoalWithIdType | undefined) => void;
  selectedGoal?: CompanyGoalWithIdType;
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
            {goal.goalTitle}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default CompanyGoalDropdown;
