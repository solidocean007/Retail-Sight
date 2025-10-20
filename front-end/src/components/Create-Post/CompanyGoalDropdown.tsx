// components/CompanyGoalDropdown.tsx
import React, { useMemo } from "react";
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
import { CompanyGoalWithIdType } from "../../utils/types";

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
  // 🔹 Dedupe goals in case originalGoal was appended twice
  const dedupedGoals = useMemo(() => {
    const map = new Map<string, CompanyGoalWithIdType>();
    for (const goal of goals) {
      if (goal?.id) map.set(goal.id, goal);
    }
    return Array.from(map.values());
  }, [goals]);

  // 🔹 Determine if current selected goal is valid
  const isValidSelection = dedupedGoals.some(
    (g) => g.id === selectedGoal?.id
  );

  // 🔹 Choose a safe value for the Select
  const selectValue = isValidSelection ? selectedGoal?.id ?? "" : "";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
        <CircularProgress size={24} />
      </div>
    );
  }

  return (
    <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
      <InputLabel shrink id="company-goal-label">
        {label}
      </InputLabel>
      <Select
        variant="outlined"
        id="company-goal-select"
        labelId="company-goal-label"
        label={label}
        displayEmpty
        value={selectValue}
        onChange={(e) => {
          const goal = dedupedGoals.find((g) => g.id === e.target.value);
          onSelect(goal);
        }}
        renderValue={(val) => {
          if (!val) {
            if (dedupedGoals.length === 0) return "No goals available";
            return `${dedupedGoals.length} Company Goal${
              dedupedGoals.length > 1 ? "s" : ""
            } available`;
          }
          return (
            selectedGoal?.goalTitle ||
            dedupedGoals.find((g) => g.id === val)?.goalTitle ||
            ""
          );
        }}
      >
        {dedupedGoals.map((goal) => {
          const isSelected = selectedGoal?.id === goal.id;
          return (
            <MenuItem
              key={goal.id}
              value={goal.id}
              sx={{
                ...(isSelected && {
                  fontWeight: "bold",
                  backgroundColor: (theme) =>
                    theme.palette.action.selected,
                }),
              }}
            >
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
