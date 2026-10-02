import { useState } from "react";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import GalloGoalFeedback from "../GoalReports/GalloGoalFeedback";
import { GoalActionsMenu } from "./GoalActionsMenu";
import {
  formatGalloGoalDate,
  getGalloGoalSummary,
} from "./utils/getGalloGoalSummary";

import "./galloGoalsTable.css";

type Props = {
  goals: FireStoreGalloGoalWithId[];
  employeeMap: Record<string, string>;
  onViewPostModal: (postId: string) => void;
  canManage: boolean;
  onEdit: (goal: FireStoreGalloGoalDocType) => void;
  onArchive: (goal: FireStoreGalloGoalDocType) => void;
  onDisable: (goal: FireStoreGalloGoalDocType) => void;
  compact?: boolean;
};

const GalloGoalsTable = ({
  goals,
  employeeMap,
  onViewPostModal,
  canManage,
  onEdit,
  onArchive,
  onDisable,
  compact = false,
}: Props) => {
  const [openRow, setOpenRow] = useState<string | null>(null);

  return (
    <div className={`gallo-table ${compact ? "gallo-table--compact" : ""}`}>
      <div className="gallo-table-header" aria-hidden="true">
        <div />
        <div>Program</div>
        <div>Dates</div>
        <div>Progress</div>
        <div className="align-right">Actions</div>
      </div>

      {goals.map((goal) => {
        const summary = getGalloGoalSummary(goal);
        const isOpen = openRow === goal.id;

        return (
          <div key={goal.id} className="gallo-table-row-wrapper">
            <div className="gallo-table-row">
              <div>
                <button
                  type="button"
                  className={`expand-btn ${isOpen ? "open" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={`gallo-goal-details-${goal.id}`}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${goal.programDetails.programTitle}`}
                  onClick={() =>
                    setOpenRow((previous) =>
                      previous === goal.id ? null : goal.id,
                    )
                  }
                >
                  ▾
                </button>
              </div>

              <div>
                <div className="program-title">
                  {goal.programDetails.programTitle}
                </div>
                <div className="program-id">ID: {goal.goalDetails.goalId}</div>
              </div>

              <div className="gallo-goals-table-dates">
                <span>
                  {formatGalloGoalDate(goal.programDetails.programStartDate)}
                </span>
                <span aria-hidden="true">→</span>
                <span>
                  {formatGalloGoalDate(goal.programDetails.programEndDate)}
                </span>
              </div>

              <div className="gallo-goals-table-progress">
                <div>
                  <strong>{summary.percent}%</strong>
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

              <div className="align-right manage-cell">
                {canManage && (
                  <GoalActionsMenu
                    status={goal.lifeCycleStatus}
                    onEdit={() => onEdit(goal)}
                    onArchive={() => onArchive(goal)}
                    onDisable={() => onDisable(goal)}
                  />
                )}
              </div>
            </div>

            {isOpen && (
              <div
                id={`gallo-goal-details-${goal.id}`}
                className="gallo-row-expanded"
              >
                <div className="gallo-row-expanded__summary">
                  <div>
                    <span>Goal</span>
                    <strong>{goal.goalDetails.goal}</strong>
                  </div>
                  <div>
                    <span>Measure</span>
                    <strong>
                      {goal.goalDetails.goalValueMin}{" "}
                      {goal.goalDetails.goalMetric}
                    </strong>
                  </div>
                  <div>
                    <span>Excluded</span>
                    <strong>{summary.excludedAccounts.length} accounts</strong>
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

                <div className="accounts-table">
                  <div className="accounts-header">
                    <div>Account</div>
                    <div>Route</div>
                    <div>Salesperson</div>
                    <div>Status</div>
                  </div>

                  {summary.activeAccounts.map((account) => {
                    const routes = Array.isArray(account.salesRouteNums)
                      ? account.salesRouteNums
                      : [account.salesRouteNums];
                    const routeLabel = routes.filter(Boolean).join(", ") || "—";
                    const representative =
                      employeeMap[routes[0]] || "Unassigned";

                    return (
                      <div
                        key={account.oppId || account.distributorAcctId}
                        className="accounts-row"
                      >
                        <div>
                          <strong>{account.accountName}</strong>
                          <small>{account.distributorAcctId}</small>
                        </div>
                        <div>{routeLabel}</div>
                        <div>{representative}</div>
                        <div>
                          {account.submittedPostId ? (
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() =>
                                onViewPostModal(account.submittedPostId!)
                              }
                            >
                              View display
                            </button>
                          ) : (
                            <span className="status-pending">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GalloGoalsTable;
