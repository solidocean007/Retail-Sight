import { Collapse, Paper } from "@mui/material";
import { useState } from "react";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import GalloGoalFeedback from "../GoalReports/GalloGoalFeedback";
import { GoalActionsMenu } from "./GoalActionsMenu";
import {
  formatGalloGoalDate,
  getGalloGoalSummary,
} from "./utils/getGalloGoalSummary";

import "./galloGoalCard.css";

interface Props {
  goal: FireStoreGalloGoalWithId;
  employeeMap: Record<string, string>;
  onViewPostModal: (id: string) => void;
  canManage: boolean;
  onEdit: (goal: FireStoreGalloGoalDocType) => void;
  onArchive: (goal: FireStoreGalloGoalDocType) => void;
  onDisable: (goal: FireStoreGalloGoalDocType) => void;
  showTimingHint?: boolean;
  timingContext?: "scheduled" | "upcoming";
  compact?: boolean;
}

const formatDisplayDate = (value?: unknown, fallback = "a future date") => {
  if (!value) return fallback;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toLocaleDateString();
  }
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime())
    ? fallback
    : parsed.toLocaleDateString();
};

const GalloGoalCard = ({
  goal,
  employeeMap,
  onViewPostModal,
  canManage,
  onEdit,
  onArchive,
  onDisable,
  showTimingHint = false,
  timingContext,
  compact = false,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const summary = getGalloGoalSummary(goal);

  return (
    <Paper
      elevation={0}
      className={`gallo-goal-card ${compact ? "gallo-goal-card--compact" : ""}`}
    >
      <header className="gallo-goal-card__header">
        <div className="gallo-goal-card__identity">
          <div className="gallo-goal-card__title-row">
            <h3>{goal.programDetails.programTitle}</h3>
            <span
              className={`gallo-goal-card__badge gallo-goal-card__badge--${goal.lifeCycleStatus}`}
            >
              {goal.lifeCycleStatus}
            </span>
          </div>
          <span className="gallo-program-id">
            ID: {goal.goalDetails.goalId}
          </span>
        </div>

        {canManage && (
          <GoalActionsMenu
            status={goal.lifeCycleStatus}
            onEdit={() => onEdit(goal)}
            onArchive={() => onArchive(goal)}
            onDisable={() => onDisable(goal)}
          />
        )}
      </header>

      {showTimingHint && timingContext === "scheduled" && (
        <div className="goal-timing-hint scheduled">
          Scheduled · Visible {formatDisplayDate(goal.displayDate)}
        </div>
      )}
      {showTimingHint && timingContext === "upcoming" && (
        <div className="goal-timing-hint upcoming">
          Upcoming · Starts{" "}
          {formatGalloGoalDate(goal.programDetails.programStartDate)}
        </div>
      )}

      <div className="gallo-goal-card__dates">
        <span>{formatGalloGoalDate(goal.programDetails.programStartDate)}</span>
        <span aria-hidden="true">→</span>
        <span>{formatGalloGoalDate(goal.programDetails.programEndDate)}</span>
      </div>

      <div className="gallo-goal-card__progress">
        <div>
          <strong>{summary.percent}% complete</strong>
          <span>
            {summary.submittedCount}/{summary.totalAccounts} submitted
          </span>
        </div>
        <div
          className="gallo-goals-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.percent}
          aria-label={`${goal.programDetails.programTitle} completion`}
        >
          <span style={{ width: `${summary.percent}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="gallo-goal-card__expand"
        aria-expanded={expanded}
        aria-controls={`gallo-goal-card-details-${goal.id}`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide account details" : "View account details"}
      </button>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div
          id={`gallo-goal-card-details-${goal.id}`}
          className="gallo-goal-card__body"
        >
          <div className="gallo-goal-card__summary">
            <div>
              <span>Goal</span>
              <strong>{goal.goalDetails.goal}</strong>
            </div>
            <div>
              <span>Measure</span>
              <strong>
                {goal.goalDetails.goalValueMin} {goal.goalDetails.goalMetric}
              </strong>
            </div>
            <div>
              <span>Excluded</span>
              <strong>{summary.excludedAccounts.length}</strong>
            </div>
            {(summary.importedAtLabel || summary.importedByLabel) && (
              <div>
                <span>Imported</span>
                <strong>
                  {summary.importedAtLabel || "Date unavailable"}
                  {summary.importedByLabel
                    ? ` · ${summary.importedByLabel}`
                    : ""}
                </strong>
              </div>
            )}
          </div>

          <GalloGoalFeedback
            galloGoalDocId={goal.id}
            reportGoalId={goal.goalDetails.goalId}
            goalTitle={goal.programDetails.programTitle}
            disabledOppIds={summary.excludedAccounts.map(
              (account) => account.oppId,
            )}
          />

          <div className="gallo-goal-card__accounts">
            {summary.activeAccounts.map((account) => {
              const routes = Array.isArray(account.salesRouteNums)
                ? account.salesRouteNums
                : [account.salesRouteNums];
              const routeLabel = routes.filter(Boolean).join(", ") || "—";
              return (
                <article
                  key={account.oppId || account.distributorAcctId}
                  className="account-card"
                >
                  <div className="account-card__title">
                    <strong>{account.accountName}</strong>
                    <small>{account.distributorAcctId}</small>
                  </div>
                  <div className="account-card__row">
                    <span>Route</span>
                    <span>{routeLabel}</span>
                  </div>
                  <div className="account-card__row">
                    <span>Salesperson</span>
                    <span>{employeeMap[routes[0]] || "Unassigned"}</span>
                  </div>
                  <div className="account-card__row">
                    <span>Status</span>
                    {account.submittedPostId ? (
                      <button
                        type="button"
                        onClick={() =>
                          onViewPostModal(account.submittedPostId!)
                        }
                      >
                        View display
                      </button>
                    ) : (
                      <span className="gallo-goal-card__status--pending">
                        Pending
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Collapse>
    </Paper>
  );
};

export default GalloGoalCard;
