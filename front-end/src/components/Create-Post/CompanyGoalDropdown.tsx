import React from "react";
import CheckIcon from "@mui/icons-material/Check";
import {
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import {  CompanyGoalWithIdType } from "../../utils/types";

interface CompanyGoalDropdownProps {
  goals: CompanyGoalWithIdType[];
  label: string;
  loading: boolean;
  onSelect: (goal: CompanyGoalWithIdType | undefined) => void;
  selectedGoal?: CompanyGoalWithIdType | null;
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
    // CompanyGoalDropdown.tsx
<FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
  <InputLabel shrink id="company-goal-label">{label}</InputLabel>
  <Select
    variant="outlined"
    id="company-goal-select"
    labelId="company-goal-label"
    label={label}
    displayEmpty
    value={selectedGoal?.id || ""}
    onChange={(e) => {
      const goal = goals.find((g) => g.id === e.target.value) || undefined;
      onSelect(goal);
    }}
    renderValue={(val) => {
      if (!val) {
        return goals.length
          ? `${goals.length} Company Goal${goals.length > 1 ? "s" : ""} available`
          : "No goals available";
      }
      return selectedGoal!.goalTitle;
    }}
  >
    {goals.map((goal) => {
      const isSelected = selectedGoal?.id === goal.id;
      return (
        <MenuItem
          key={goal.id}
          value={goal.id}
          selected={isSelected}
          sx={{
            ...(isSelected && {
              fontWeight: "bold",
              backgroundColor: (theme) =>
                theme.palette.action.selected,
            }),
          }}
        >
          {/* optional check‐icon */}
          {isSelected && (
            <ListItemIcon sx={{ minWidth: 32 }}>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
          )}
          <ListItemText primary={goal.goalTitle} />
        </MenuItem>
      );
    })}
  </Select>
</FormControl>

  );
};

export default CompanyGoalDropdown;
