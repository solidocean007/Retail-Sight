import { useState, useMemo, useCallback, useEffect } from "react";
import { Box, Collapse, Typography } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import ArchivedMonthChip from "./ArchivedMonthChip";
import CompanyGoalCard from "../CompanyGoalCard";
import UserCompanyGoalCard from "../UserCompanyGoalCard";
import "./archivedGoalsLayout.css";

interface ArchivedYearSectionProps {
  year: string;
  months: Record<string, CompanyGoalWithIdType[]>;
  isMobile: boolean;
  onDelete?: (id: string) => void;
  salesRouteNum?: string;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
  expandedGoalId: string | null;
  setExpandedGoalId: React.Dispatch<React.SetStateAction<string | null>>;
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
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [displayedMonth, setDisplayedMonth] = useState<string | null>(null); // 👈 actual mounted content
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [slidePhase, setSlidePhase] = useState<"in" | "out" | null>(null);

  const sortedMonths = useMemo(
    () =>
      Object.entries(months).sort(
        ([a], [b]) =>
          new Date(`${b} 1, ${year}`).getTime() -
          new Date(`${a} 1, ${year}`).getTime()
      ),
    [months, year]
  );

  const monthIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedMonths.forEach(([m], i) => map.set(m, i));
    return map;
  }, [sortedMonths]);

  const handleMonthClick = useCallback(
    (month: string) => {
      if (!expanded) setExpanded(true);

      // Determine direction
      const nextIdx = monthIndexMap.get(month) ?? 0;
      const prevIdx =
        expandedMonth != null ? monthIndexMap.get(expandedMonth) ?? 0 : nextIdx;
      const newDir = nextIdx > prevIdx ? "right" : "left";

      // If same month clicked, collapse
      if (expandedMonth === month) {
        setSlideDir(newDir);
        setSlidePhase("out");
        setTimeout(() => {
          setExpandedMonth(null);
          setDisplayedMonth(null);
          setSlidePhase(null);
        }, 300);
        return;
      }

      // Animate current out first if something already open
      if (expandedMonth) {
        setSlideDir(newDir);
        setSlidePhase("out");
        setTimeout(() => {
          setExpandedMonth(month);
          setDisplayedMonth(month);
          setSlidePhase("in");
        }, 300);
      } else {
        // nothing open yet
        setSlideDir(newDir);
        setExpandedMonth(month);
        setDisplayedMonth(month);
        setSlidePhase("in");
      }
    },
    [expanded, monthIndexMap, expandedMonth]
  );

  const uniqueGoalCount = useMemo(
    () => new Set(Object.values(months).flat().map((g) => g.id)).size,
    [months]
  );

  const expandedGoals =
    displayedMonth && months[displayedMonth] ? months[displayedMonth] : [];

  return (
    <Box className="archived-year-card">
      <Box
        className="archived-year-header"
        onClick={() => setExpanded((x) => !x)}
        role="button"
        tabIndex={0}
      >
        <Typography variant="h6">
          {/* {year} Archived Goals ({uniqueGoalCount}) */}
          {year} Archived Goals 
        </Typography>
        <span className={`arrow ${expanded ? "up" : "down"}`}>▼</span>
      </Box>

      <Collapse in={expanded} timeout={{ enter: 300, exit: 200 }} unmountOnExit>
        <Box className="archived-months-row">
          {sortedMonths.map(([month, goals]) => (
            <ArchivedMonthChip
              key={month}
              month={month}
              count={goals.length}
              isActive={expandedMonth === month}
              onToggle={() => handleMonthClick(month)}
            />
          ))}
        </Box>

        {/* Month goals */}
        <Collapse
          in={!!displayedMonth}
          timeout={{ enter: 400, exit: 250 }}
          unmountOnExit
        >
          <Box
            className={`archived-goal-cards slide-${slideDir ?? "right"} ${
              slidePhase === "out" ? "slide-exit" : "slide-enter"
            }`}
          >
            {expandedGoals.map((goal) =>
              !salesRouteNum ? (
                <CompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={(id) =>
                    setExpandedGoalId((prev) => (prev === id ? null : id))
                  }
                  mobile={isMobile}
                  onDelete={onDelete ? () => onDelete(goal.id) : undefined}
                  onEdit={onEdit}
                  onViewPostModal={onViewPostModal}
                />
              ) : (
                <UserCompanyGoalCard
                  key={goal.id}
                  goal={goal}
                  salesRouteNum={salesRouteNum}
                  mobile={isMobile}
                  expanded={expandedGoalId === goal.id}
                  onToggleExpand={(id) =>
                    setExpandedGoalId((prev) => (prev === id ? null : id))
                  }
                  onViewPostModal={onViewPostModal}
                />
              )
            )}
          </Box>
        </Collapse>
      </Collapse>
    </Box>
  );
};

export default ArchivedYearSection;
