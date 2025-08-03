import { useState } from "react";
import { Box, Collapse, Typography } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import ArchivedMonthSection from "./ArchivedMonthChip";

interface ArchivedYearSectionProps {
  year: string;
  months: Record<string, CompanyGoalWithIdType[]>;
  isMobile?: boolean;
  onDelete?: (id: string) => void;
  salesRouteNum?: string | undefined;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
  onViewPostModal?: (postId: string) => void;
  expandedGoalId: string | null;
  setExpandedGoalId: React.Dispatch<React.SetStateAction<string | null>>;
}

const ArchivedYearSection = ({
  year,
  months,
  isMobile,
  onDelete,
  salesRouteNum,
  onEdit,
  onViewPostModal,
  expandedGoalId,
  setExpandedGoalId,
}: ArchivedYearSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const totalGoals = Object.values(months).flat().length;

  const toggleMonth = (month: string) => {
    setExpandedMonth(expandedMonth === month ? null : month);
  };

  return (
    <Box className="archived-year-card" onClick={() => setExpanded(!expanded)}>
      <Box className="archived-year-header">
        <Typography variant="h6">
          {year} Archived Goals ({totalGoals})
        </Typography>
        <span className={`arrow ${expanded ? "up" : "down"}`}>▼</span>
      </Box>

      <Collapse in={expanded}>
        <Box className="archived-months-row">
          {Object.entries(months)
            .sort(
              ([monthA], [monthB]) =>
                new Date(`${monthB} 1, ${year}`).getTime() -
                new Date(`${monthA} 1, ${year}`).getTime()
            )
            .map(([month, goals]) => (
              <ArchivedMonthSection
                key={month}
                month={month}
                goals={goals}
                isMobile={isMobile}
                onDelete={onDelete}
                salesRouteNum={salesRouteNum}
                onEdit={onEdit}
                expanded={expandedMonth === month}
                onToggle={() => toggleMonth(month)}
                onViewPostModal={onViewPostModal} // 👈 pass the callback
                expandedGoalId={expandedGoalId}
                setExpandedGoalId={setExpandedGoalId}
              />
            ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ArchivedYearSection;
