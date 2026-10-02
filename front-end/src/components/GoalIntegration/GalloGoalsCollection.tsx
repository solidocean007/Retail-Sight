import { useMediaQuery, useTheme } from "@mui/material";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import GalloGoalCard from "./GalloGoalCard";
import GalloGoalsTable from "./GalloGoalsTable";

type Props = {
  goals: FireStoreGalloGoalWithId[];
  employeeMap: Record<string, string>;
  onViewPostModal: (postId: string) => void;
  canManage: boolean;
  onEdit: (goal: FireStoreGalloGoalDocType) => void;
  onArchive: (goal: FireStoreGalloGoalDocType) => void;
  onDisable: (goal: FireStoreGalloGoalDocType) => void;
  emptyTitle: string;
  emptyMessage: string;
  compact?: boolean;
  timingContext?: "scheduled" | "upcoming";
};

const GalloGoalsCollection = ({
  goals,
  employeeMap,
  onViewPostModal,
  canManage,
  onEdit,
  onArchive,
  onDisable,
  emptyTitle,
  emptyMessage,
  compact = false,
  timingContext,
}: Props) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  if (goals.length === 0) {
    return (
      <div className="gallo-goals-empty" role="status">
        <strong>{emptyTitle}</strong>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <GalloGoalsTable
        goals={goals}
        employeeMap={employeeMap}
        onViewPostModal={onViewPostModal}
        canManage={canManage}
        onEdit={onEdit}
        onArchive={onArchive}
        onDisable={onDisable}
        compact={compact}
      />
    );
  }

  return (
    <div className={`gallo-goal-card-list ${compact ? "is-compact" : ""}`}>
      {goals.map((goal) => (
        <GalloGoalCard
          key={goal.id}
          goal={goal}
          employeeMap={employeeMap}
          onViewPostModal={onViewPostModal}
          canManage={canManage}
          onEdit={onEdit}
          onArchive={onArchive}
          onDisable={onDisable}
          compact={compact}
          showTimingHint={Boolean(timingContext)}
          timingContext={timingContext}
        />
      ))}
    </div>
  );
};

export default GalloGoalsCollection;
