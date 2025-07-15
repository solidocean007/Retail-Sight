import { useMemo } from "react";
import { Box } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import ArchivedYearSection from "./ArchivedYearSection";
import "./archivedGoalsLayout.css";

interface ArchivedGoalsLayoutProps {
  archivedGoals: CompanyGoalWithIdType[];
  isMobile?: boolean;
  salesRouteNum?: string | undefined;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
}

const ArchivedGoalsLayout = ({
  archivedGoals,
  isMobile,
  salesRouteNum,
  onDelete,
  onEdit,
}: ArchivedGoalsLayoutProps) => {
  const groupedGoals = useMemo(() => {
    return archivedGoals.reduce<
      Record<string, Record<string, CompanyGoalWithIdType[]>>
    >((acc, goal) => {
      const date = new Date(goal.goalEndDate);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString("default", { month: "long" });

      if (!acc[year]) acc[year] = {};
      if (!acc[year][month]) acc[year][month] = [];
      acc[year][month].push(goal);

      return acc;
    }, {});
  }, [archivedGoals]);

  return (
    <Box className="archived-goals-container">
      {Object.entries(groupedGoals)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
        .map(([year, months]) => (
          <ArchivedYearSection
            key={year}
            year={year}
            months={months}
            isMobile={isMobile}
            salesRouteNum={salesRouteNum}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
    </Box>
  );
};

export default ArchivedGoalsLayout;
