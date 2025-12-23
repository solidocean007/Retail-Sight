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
import { FireStoreGalloGoalDocType } from "../../utils/types";

interface GalloGoalDropdownProps {
  goals: FireStoreGalloGoalDocType[];
  label: string;
  loading: boolean;
  onSelect: (goal: FireStoreGalloGoalDocType | undefined) => void;
  selectedGoalId?: string | null;
}

const GalloGoalDropdown: React.FC<GalloGoalDropdownProps> = ({
  goals,
  label,
  loading,
  onSelect,
  selectedGoalId,
}) => {
  const dedupedGoals = useMemo(() => {
    const map = new Map<string, FireStoreGalloGoalDocType>();
    for (const g of goals) {
      const id = g?.goalDetails?.goalId;
      if (id) map.set(id, g);
    }
    return Array.from(map.values());
  }, [goals]);

  const isValidSelection = dedupedGoals.some(
    (g) => g.goalDetails.goalId === selectedGoalId
  );

  const selectValue = isValidSelection ? selectedGoalId ?? "" : "";

  if (loading) return <CircularProgress />;

  return (
    <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
      <InputLabel shrink id="gallo-goal-label">
        {label}
      </InputLabel>

      <Select
        id="gallo-goal-select"
        labelId="gallo-goal-label"
        label={label}
        displayEmpty
        value={selectValue}
        disabled={dedupedGoals.length === 0}
        onChange={(e) => {
          const goal = dedupedGoals.find(
            (g) => g.goalDetails.goalId === e.target.value
          );
          onSelect(goal);
        }}
        renderValue={(val) => {
          if (!val) {
            if (dedupedGoals.length === 0) return "No Gallo goals available";
            return `${dedupedGoals.length} Gallo Goal${
              dedupedGoals.length > 1 ? "s" : ""
            } available`;
          }
          return (
            dedupedGoals.find((g) => g.goalDetails.goalId === val)?.goalDetails
              .goal || ""
          );
        }}
      >
        {dedupedGoals.map((goal) => {
          const isSelected = goal.goalDetails.goalId === selectedGoalId;
          return (
            <MenuItem
              key={goal.goalDetails.goalId}
              value={goal.goalDetails.goalId}
              sx={{
                ...(isSelected && {
                  fontWeight: "bold",
                  backgroundColor: (theme) => theme.palette.action.selected,
                }),
              }}
            >
              {isSelected && (
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText primary={goal.goalDetails.goal} />
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};

export default GalloGoalDropdown;
