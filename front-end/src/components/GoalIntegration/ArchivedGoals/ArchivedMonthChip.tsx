import { Box, Collapse, Chip } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import CompanyGoalCard from "../CompanyGoalCard";
import { useState } from "react";

interface ArchivedMonthSectionProps {
  month: string;
  goals: CompanyGoalWithIdType[];
  isMobile?: boolean;
  onDelete?: (id: string) => void;
  salesRouteNum?: string;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
  expanded: boolean;
  onToggle: () => void;
  onViewPostModal?: (postId: string) => void;
}

const ArchivedMonthSection = ({
  month,
  goals,
  isMobile,
  onDelete,
  salesRouteNum,
  onEdit,
  expanded,
  onToggle,
  onViewPostModal
}: ArchivedMonthSectionProps) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoalId((prev) => (prev === goalId ? null : goalId));
  };
  return (
    <Box className="archived-month-container">
      <Chip
        label={`${month} (${goals.length})`}
        clickable
        className={`archived-month-chip ${expanded ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent parent toggle
          onToggle();
        }}
      />
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box className="archived-goal-cards">
          {goals.map((goal) => (
            <CompanyGoalCard
              key={goal.id}
              goal={goal}
              expanded={expandedGoalId === goal.id}
              onToggleExpand={handleToggleExpand}
              mobile={isMobile}
              onDelete={onDelete ? () => onDelete(goal.id) : undefined}
              salesRouteNum={salesRouteNum}
              onEdit={onEdit}
              onViewPostModal={onViewPostModal}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

export default ArchivedMonthSection;
