import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Collapse } from "@mui/material";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";

import { CompanyGoalWithIdType } from "../../../utils/types";
import CompanyGoalCard from "../CompanyGoalCard";
import UserCompanyGoalCard from "../UserCompanyGoalCard";
import ArchivedMonthChip from "./ArchivedMonthChip";

interface ArchivedYearSectionProps {
  year: string;
  months: Record<string, CompanyGoalWithIdType[]>;
  isMobile: boolean;
  onDelete?: (id: string) => void;
  salesRouteNum?: string;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>,
  ) => void;
  expandedGoalId: string | null;
  setExpandedGoalId: Dispatch<SetStateAction<string | null>>;
  onViewPostModal: (postId: string) => void;
}

const ArchivedYearSection = ({
  year,
  months,
  isMobile,
  onDelete,
  salesRouteNum,
  onEdit,
  expandedGoalId,
  setExpandedGoalId,
  onViewPostModal,
}: ArchivedYearSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const sortedMonths = useMemo(
    () =>
      Object.entries(months)
        .map(([month, goals]) => [
          month,
          [...goals].sort((a, b) =>
            b.goalEndDate.localeCompare(a.goalEndDate),
          ),
        ] as const)
        .sort(
          ([monthA], [monthB]) =>
            new Date(`${monthB} 1, ${year}`).getTime() -
            new Date(`${monthA} 1, ${year}`).getTime(),
        ),
    [months, year],
  );

  const activeMonth = selectedMonth ?? sortedMonths[0]?.[0] ?? null;
  const activeGoals = activeMonth ? months[activeMonth] ?? [] : [];
  const uniqueGoalCount = useMemo(
    () => new Set(Object.values(months).flat().map((goal) => goal.id)).size,
    [months],
  );

  return (
    <article className={`archived-year-card ${expanded ? "archived-year-card--expanded" : ""}`}>
      <button
        type="button"
        className="archived-year-header"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={`archived-year-${year}`}
      >
        <span>
          <strong>{year}</strong>
          <small>{uniqueGoalCount} archived goal{uniqueGoalCount === 1 ? "" : "s"}</small>
        </span>
        <ExpandMoreOutlinedIcon />
      </button>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="archived-year-content" id={`archived-year-${year}`}>
          <div className="archived-months-row" aria-label={`${year} archive months`}>
            {sortedMonths.map(([month, goals]) => (
              <ArchivedMonthChip
                key={month}
                month={month}
                count={goals.length}
                isActive={activeMonth === month}
                onToggle={() => setSelectedMonth(month)}
              />
            ))}
          </div>

          <div className="archived-goal-cards">
            {activeGoals.map((goal) =>
              salesRouteNum ? (
                <UserCompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  salesRouteNum={salesRouteNum}
                  mobile={isMobile}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={(id) =>
                    setExpandedGoalId((current) => (current === id ? null : id))
                  }
                  onViewPostModal={onViewPostModal}
                />
              ) : (
                <CompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={(id) =>
                    setExpandedGoalId((current) => (current === id ? null : id))
                  }
                  mobile={isMobile}
                  onDelete={onDelete ? () => onDelete(goal.id) : undefined}
                  onEdit={onEdit}
                  onViewPostModal={onViewPostModal}
                />
              ),
            )}
          </div>
        </div>
      </Collapse>
    </article>
  );
};

export default ArchivedYearSection;
