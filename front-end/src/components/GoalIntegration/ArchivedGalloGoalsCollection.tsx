import { useMemo, useState } from "react";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import GalloGoalsCollection from "./GalloGoalsCollection";

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
  revealAll?: boolean;
};

type ArchivedGoalGroup = {
  key: string;
  label: string;
  timestamp: number;
  goals: FireStoreGalloGoalWithId[];
};

const START_MONTH_PATTERN = /^(\d{4})-(\d{2})/;

const getStartMonth = (goal: FireStoreGalloGoalWithId) => {
  const startDate = goal.programDetails.programStartDate?.trim() ?? "";
  const match = startDate.match(START_MONTH_PATTERN);

  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;

    if (monthIndex >= 0 && monthIndex <= 11) {
      const timestamp = Date.UTC(year, monthIndex, 1);
      return {
        key: `${match[1]}-${match[2]}`,
        label: new Intl.DateTimeFormat(undefined, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(timestamp),
        timestamp,
      };
    }
  }

  return {
    key: "unknown",
    label: "Start date unavailable",
    timestamp: Number.NEGATIVE_INFINITY,
  };
};

const groupGoalsByStartMonth = (
  goals: FireStoreGalloGoalWithId[],
): ArchivedGoalGroup[] => {
  const grouped = new Map<string, ArchivedGoalGroup>();

  goals.forEach((goal) => {
    const month = getStartMonth(goal);
    const existing = grouped.get(month.key);

    if (existing) {
      existing.goals.push(goal);
      return;
    }

    grouped.set(month.key, { ...month, goals: [goal] });
  });

  return [...grouped.values()].sort((a, b) => b.timestamp - a.timestamp);
};

const ArchivedGalloGoalsCollection = ({
  goals,
  employeeMap,
  onViewPostModal,
  canManage,
  onEdit,
  onArchive,
  onDisable,
  emptyTitle,
  emptyMessage,
  revealAll = false,
}: Props) => {
  const groups = useMemo(() => groupGoalsByStartMonth(goals), [goals]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups[0] ? [groups[0].key] : []),
  );

  if (goals.length === 0) {
    return (
      <div className="gallo-goals-empty" role="status">
        <strong>{emptyTitle}</strong>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  return (
    <div className="archived-gallo-groups">
      {groups.map((group) => {
        const isExpanded = revealAll || expandedGroups.has(group.key);
        const contentId = `archived-gallo-group-${group.key}`;

        return (
          <section className="archived-gallo-group" key={group.key}>
            <button
              type="button"
              className="archived-gallo-group__toggle"
              aria-expanded={isExpanded}
              aria-controls={contentId}
              onClick={() => toggleGroup(group.key)}
            >
              <span className="archived-gallo-group__chevron" aria-hidden="true">
                ›
              </span>
              <span className="archived-gallo-group__label">
                <strong>{group.label}</strong>
                <small>Program start month</small>
              </span>
              <span className="archived-gallo-group__count">
                {group.goals.length} {group.goals.length === 1 ? "goal" : "goals"}
              </span>
            </button>

            {isExpanded && (
              <div className="archived-gallo-group__content" id={contentId}>
                <GalloGoalsCollection
                  goals={group.goals}
                  employeeMap={employeeMap}
                  onViewPostModal={onViewPostModal}
                  canManage={canManage}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onDisable={onDisable}
                  emptyTitle={emptyTitle}
                  emptyMessage={emptyMessage}
                  compact
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ArchivedGalloGoalsCollection;
