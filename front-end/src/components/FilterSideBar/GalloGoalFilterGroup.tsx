import React, { useMemo } from "react";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import "./goalFilterGroup.css";

interface GalloGoalFilterGroupProps {
  goals: FireStoreGalloGoalDocType[];
  selectedGoalId?: string | null;
  onChange: (goalId: string | null, goalTitle: string | null) => void;
  loading?: boolean;
}

type NormalizedGalloGoal = {
  id: string;
  title: string;
  year: string;
  lifecycle: string;
};

const GalloGoalFilterGroup: React.FC<GalloGoalFilterGroupProps> = ({
  goals,
  selectedGoalId,
  onChange,
  loading = false,
}) => {
  const normalizedGoals = useMemo<NormalizedGalloGoal[]>(() => {
    return goals
      .map((g) => {
        const dateStr =
          g.programDetails.programDisplayDate ||
          g.programDetails.programStartDate;

        const date = new Date(dateStr);
        const year = isNaN(date.getTime())
          ? "Unknown"
          : date.getFullYear().toString();

        return {
          id: g.goalDetails.goalId,
          title: g.goalDetails.goal,
          year,
          lifecycle: g.lifeCycleStatus,
        };
      })
      .sort((a, b) => {
        if (a.year === "Unknown" && b.year !== "Unknown") return 1;
        if (b.year === "Unknown" && a.year !== "Unknown") return -1;
        return (
          parseInt(b.year) - parseInt(a.year) || a.title.localeCompare(b.title)
        );
      });
  }, [goals]);

  const selectedGoal =
    normalizedGoals.find((g) => g.id === selectedGoalId) || null;

  const filterOptions = createFilterOptions({
    matchFrom: "any",
    stringify: (option: NormalizedGalloGoal) =>
      `${option.title} ${option.year}`,
  });

  return (
    <div className="goal-filter-group">
      <Autocomplete
        className="goal-filter-autocomplete"
        options={normalizedGoals}
        groupBy={(goal) => goal.year}
        getOptionLabel={(goal) => goal.title}
        value={selectedGoal}
        onChange={(_, value) =>
          onChange(value?.id ?? null, value?.title ?? null)
        }
        filterOptions={filterOptions}
        loading={loading}
        loadingText="Loading Gallo goals…"
        noOptionsText="No Gallo goals found"
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search or Select Gallo Goal"
            placeholder="Program, goal, or year…"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderGroup={(params) => (
          <div key={params.key} className="goal-year-group">
            <div className="goal-year-header">{params.group}</div>
            {params.children}
          </div>
        )}
      />
    </div>
  );
};

export default GalloGoalFilterGroup;
