import { useMemo, useState } from "react";
import { Box } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import ArchivedYearSection from "./ArchivedYearSection";
import "./archivedGoalsLayout.css";
import PostViewerModal from "../../PostViewerModal";
import { RootState } from "../../../utils/store";
import { useSelector } from "react-redux";

interface ArchivedGoalsLayoutProps {
  archivedGoals: CompanyGoalWithIdType[];
  isMobile: boolean;
  salesRouteNum?: string | undefined;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
  onViewPostModal: (postId: string) => void
}

const ArchivedGoalsLayout = ({
  archivedGoals,
  isMobile,
  salesRouteNum,
  onDelete,
  onEdit,
  onViewPostModal,
}: ArchivedGoalsLayoutProps) => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser); // ✅ Required for modal
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
 

  const groupedGoals = useMemo(() => {
    return archivedGoals.reduce<
      Record<string, Record<string, CompanyGoalWithIdType[]>>
    >((acc, goal) => {
      const start = new Date(goal.goalStartDate);
      const end = new Date(goal.goalEndDate);

      // Defensive check: skip invalid date ranges
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return acc;
      }

      const current = new Date(start);

      while (current <= end) {
        const year = current.getFullYear().toString();
        const month = current.toLocaleString("default", { month: "long" });

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = [];

        const alreadyExists = acc[year][month].some((g) => g.id === goal.id);
        if (!alreadyExists) {
          acc[year][month].push(goal);
        }

        current.setMonth(current.getMonth() + 1);
      }

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
            expandedGoalId={expandedGoalId}
            setExpandedGoalId={setExpandedGoalId}
            onViewPostModal={onViewPostModal}
          />
        ))}
      
    </Box>
  );
};

export default ArchivedGoalsLayout;
