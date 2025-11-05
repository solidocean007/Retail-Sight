import { Box, Collapse, Chip } from "@mui/material";
import { CompanyGoalWithIdType } from "../../../utils/types";
import CompanyGoalCard from "../CompanyGoalCard";
import { useRef, useState } from "react";
import PostViewerModal from "../../PostViewerModal";
import { useSelector } from "react-redux";
import { RootState } from "../../../utils/store";

interface ArchivedMonthChipProps {
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
  onViewPostModal?: (postId: string, scrollRef?: HTMLElement) => void;
  expandedGoalId: string | null;
  setExpandedGoalId: React.Dispatch<React.SetStateAction<string | null>>;
}

const ArchivedMonthChip = ({
  month,
  goals,
  isMobile,
  onDelete,
  salesRouteNum,
  onEdit,
  expanded,
  onToggle,
  onViewPostModal,
  expandedGoalId,
  setExpandedGoalId,
}: ArchivedMonthChipProps) => {
  const scrollTargetRef = useRef<HTMLElement | null>(null);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const openPostViewer = (postId: string, target?: HTMLElement) => {
    if (target) scrollTargetRef.current = target;
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  const closePostViewer = () => {
    setPostViewerOpen(false);
    setTimeout(() => {
      if (scrollTargetRef.current) {
        scrollTargetRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100); // Give DOM a moment to stabilize
  };

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
              onViewPostModal={openPostViewer}
            />
          ))}
        </Box>
      </Collapse>
      <PostViewerModal
        key={postIdToView}
        postId={postIdToView || ""}
        open={postViewerOpen}
        onClose={closePostViewer}
        currentUserUid={currentUser?.uid}
      />
    </Box>
  );
};

export default ArchivedMonthChip;
