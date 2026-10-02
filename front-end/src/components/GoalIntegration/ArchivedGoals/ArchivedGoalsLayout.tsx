import { useMemo, useState } from "react";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";

import { CompanyGoalWithIdType } from "../../../utils/types";
import ArchivedYearSection from "./ArchivedYearSection";

import "./archivedGoalsLayout.css";

interface ArchivedGoalsLayoutProps {
  archivedGoals: CompanyGoalWithIdType[];
  isMobile: boolean;
  salesRouteNum?: string;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>,
  ) => void;
  onViewPostModal: (postId: string) => void;
}

const ArchivedGoalsLayout = ({
  archivedGoals,
  isMobile,
  salesRouteNum,
  onDelete,
  onEdit,
  onViewPostModal,
}: ArchivedGoalsLayoutProps) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const groupedGoals = useMemo(
    () =>
      archivedGoals.reduce<
        Record<string, Record<string, CompanyGoalWithIdType[]>>
      >((groups, goal) => {
        const endDate = new Date(`${goal.goalEndDate}T00:00:00`);
        if (Number.isNaN(endDate.getTime())) return groups;

        const year = String(endDate.getFullYear());
        const month = endDate.toLocaleString(undefined, { month: "long" });
        groups[year] ??= {};
        groups[year][month] ??= [];
        groups[year][month].push(goal);
        return groups;
      }, {}),
    [archivedGoals],
  );

  return (
    <section className="archived-goals-container" aria-labelledby="archived-goals-heading">
      <div className="archived-goals-heading">
        <span className="archived-goals-heading__icon" aria-hidden="true">
          <ArchiveOutlinedIcon />
        </span>
        <div>
          <h2 id="archived-goals-heading">Archived goals</h2>
          <p>Completed goal periods, organized by their end date.</p>
        </div>
        <span className="archived-goals-heading__count">{archivedGoals.length}</span>
      </div>

      <div className="archived-goals-years">
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
      </div>
    </section>
  );
};

export default ArchivedGoalsLayout;
