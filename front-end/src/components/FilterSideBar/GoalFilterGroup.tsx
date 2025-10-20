// components/filters/GoalFilterGroup.tsx
import React, { useMemo } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import { CompanyGoalWithIdType } from "../../utils/types";
import "./goalFilterGroup.css";

interface GoalFilterGroupProps {
  goals: CompanyGoalWithIdType[];
  selectedGoalId?: string | null;
  onChange: (goalId: string | null, goalTitle: string | null) => void;
  loading?: boolean;
}

const GoalFilterGroup: React.FC<GoalFilterGroupProps> = ({
  goals,
  selectedGoalId,
  onChange,
  loading = false,
}) => {
  // ✅ Safely compute year from goalStartDate
  const processedGoals = useMemo(() => {
    return goals
      .map((g) => {
        const date = g.goalStartDate
          ? new Date(g.goalStartDate)
          : new Date(g.createdAt);
        const year = isNaN(date.getTime()) ? "Unknown" : date.getFullYear().toString();
        return { ...g, year };
      })
      .sort((a, b) => {
        // Sort by year (descending), then title alphabetically
        if (a.year === "Unknown" && b.year !== "Unknown") return 1;
        if (b.year === "Unknown" && a.year !== "Unknown") return -1;
        return parseInt(b.year) - parseInt(a.year) || a.goalTitle.localeCompare(b.goalTitle);
      });
  }, [goals]);

  const selectedGoal =
    processedGoals.find((g) => g.id === selectedGoalId) || null;

  const filterOptions = createFilterOptions({
    matchFrom: "any",
    stringify: (option: CompanyGoalWithIdType & { year: string }) =>
      `${option.goalTitle} ${option.year}`,
  });

  return (
    <div className="goal-filter-group">
      <Autocomplete
        className="goal-filter-autocomplete"
        options={processedGoals}
        groupBy={(goal) => goal.year}
        getOptionLabel={(goal) => goal.goalTitle}
        value={selectedGoal}
        onChange={(_, value) =>
          onChange(value?.id ?? null, value?.goalTitle ?? null)
        }
        filterOptions={filterOptions}
        loading={loading}
        loadingText="Loading goals..."
        noOptionsText="No goals found"
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search or Select Goal"
            placeholder="Type goal name or year..."
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

export default GoalFilterGroup;
