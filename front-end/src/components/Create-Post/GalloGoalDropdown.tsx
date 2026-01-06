import React, { useMemo, useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import {
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  useMediaQuery,
} from "@mui/material";
import { FireStoreGalloGoalDocType } from "../../utils/types";

interface GalloGoalDropdownProps {
  goals: FireStoreGalloGoalDocType[];
  label: string;
  loading: boolean;
  onSelect: (goal: FireStoreGalloGoalDocType | undefined) => void;
  selectedGoalId?: string | null;
}

import { GoalPickerModal } from "./GoalPickerModal";

const GalloGoalDropdown: React.FC<GalloGoalDropdownProps> = ({
  goals,
  label,
  loading,
  onSelect,
  selectedGoalId,
}) => {
  const isMobile = useMediaQuery("(max-width:900px)");
  const [openModal, setOpenModal] = useState(false);

  const dedupedGoals = useMemo(() => {
    const map = new Map<string, FireStoreGalloGoalDocType>();
    goals.forEach((g) => {
      const id = g?.goalDetails?.goalId;
      if (id) map.set(id, g);
    });
    return Array.from(map.values());
  }, [goals]);

  const isDisabled = loading || dedupedGoals.length === 0;

  if (loading) return <CircularProgress />;

  // ✅ MOBILE: fake select → modal
  if (isMobile) {
    return (
      <>
        <FormControl disabled={goals.length === 0} fullWidth sx={{ mb: 2 }}>
          <InputLabel shrink>{label}</InputLabel>
          <div
            onClick={() => {
              if (!isDisabled) setOpenModal(true);
            }}
            style={{
              padding: "14px",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.5 : 1,
              pointerEvents: isDisabled ? "none" : "auto",
              background: "var(--input-background)",
            }}
          >
            {isDisabled
              ? "No Gallo goals available"
              : selectedGoalId
              ? dedupedGoals.find(
                  (g) => g.goalDetails.goalId === selectedGoalId
                )?.goalDetails.goal
              : `${dedupedGoals.length} Gallo Goals available`}
          </div>
        </FormControl>

        <GoalPickerModal
          open={openModal}
          title={label}
          goals={dedupedGoals}
          selectedId={selectedGoalId}
          getId={(g) => g.goalDetails.goalId}
          getLabel={(g) => g.goalDetails.goal}
          onClose={() => setOpenModal(false)}
          onSelect={onSelect}
        />
      </>
    );
  }

  // ✅ DESKTOP: normal Select
  return (
    <FormControl fullWidth sx={{ mb: 2 }} disabled={isDisabled}>
      <InputLabel shrink>{label}</InputLabel>
      <Select
        value={selectedGoalId ?? ""}
        label={label}
        disabled={isDisabled}
        displayEmpty
        renderValue={(val) => {
          if (!val) {
            return dedupedGoals.length === 0
              ? "No Gallo goals available"
              : `${dedupedGoals.length} Gallo Goals available`;
          }

          return dedupedGoals.find((g) => g.goalDetails.goalId === val)
            ?.goalDetails.goal;
        }}
        onChange={(e) =>
          onSelect(
            dedupedGoals.find((g) => g.goalDetails.goalId === e.target.value)
          )
        }
      >
        {dedupedGoals.length === 0 && (
          <MenuItem disabled value="">
            No Gallo goals available
          </MenuItem>
        )}

        {dedupedGoals.map((g) => (
          <MenuItem key={g.goalDetails.goalId} value={g.goalDetails.goalId}>
            {g.goalDetails.goal}
          </MenuItem>
        ))}
      </Select>

      <GoalPickerModal
        open={openModal && !isDisabled}
        title={label}
        goals={dedupedGoals}
        selectedId={selectedGoalId}
        getId={(g) => g.goalDetails.goalId}
        getLabel={(g) => g.programDetails.programTitle}
        onClose={() => setOpenModal(false)}
        onSelect={onSelect}
      />
    </FormControl>
  );
};

export default GalloGoalDropdown;
