import React, { useState } from "react";
import "./galloGoalsTable.css";
import { FireStoreGalloGoalDocType } from "../../utils/types";
import { formatGoalDate } from "./GalloIntegration/MyGalloGoalCard";
import { GoalActionsMenu } from "./GoalActionsMenu";

type Props = {
  goals: FireStoreGalloGoalDocType[];
  employeeMap: Record<string, string>;
  onViewPostModal: (postId: string) => void;

  canManage: boolean;
  activeActionsGoalId: string | null;

  openActions: (goalId: string, anchor: HTMLElement) => void;
  closeActions: () => void;

  onEdit: (goal: FireStoreGalloGoalDocType) => void;
  onArchive: (goal: FireStoreGalloGoalDocType) => void;
  onDisable: (goal: FireStoreGalloGoalDocType) => void;
};

export default function GalloGoalsTable({
  goals,
  employeeMap,
  onViewPostModal,
  canManage,
  activeActionsGoalId,
  openActions,
  closeActions,
  onEdit,
  onArchive,
  onDisable,
}: Props) {
  const [openRow, setOpenRow] = useState<string | null>(null);

  return (
    <div className="gallo-table">
      {/* Header */}
      <div className="gallo-table-header">
        <div />
        <div>Program</div>
        <div>Status</div>
        <div>Dates</div>
        <div>Progress</div>
        <div className="align-right">Manage</div>
      </div>

      {goals.map((goal) => {
        const activeAccounts = goal.accounts.filter(
          (a) => a.status === "active",
        );
        const submittedCount = activeAccounts.filter(
          (a) => a.submittedPostId,
        ).length;
        const isOpen = openRow === goal.id;

        return (
          <div key={goal.id} className="gallo-table-row-wrapper">
            {/* Main Row */}
            <div className="gallo-table-row">
              <div>
                <button
                  className="expand-btn"
                  onClick={() => setOpenRow(isOpen ? null : goal.id)}
                >
                  {isOpen ? "▴" : "▾"}
                </button>
              </div>

              <div>
                <div className="program-title">
                  {goal.programDetails.programTitle}
                </div>
                <div className="program-id">ID: {goal.goalDetails.goalId}</div>
              </div>

              <div>
                <span className={`status-pill status-${goal.lifeCycleStatus}`}>
                  {goal.lifeCycleStatus.toUpperCase()}
                </span>
              </div>

              <div className="dates">
                <div>
                  Start: {formatGoalDate(goal.programDetails.programStartDate)}
                </div>
                <div>
                  End: {formatGoalDate(goal.programDetails.programEndDate)}
                </div>
              </div>

              <div>
                <strong>{submittedCount}</strong> / {activeAccounts.length}
              </div>

              <div className="align-right manage-cell">
                {canManage && (
                  <button
                    className="manage-btn"
                    onMouseEnter={(e) => openActions(goal.id, e.currentTarget)}
                    onMouseLeave={closeActions}
                  >
                    Manage
                  </button>
                )}

                {canManage && activeActionsGoalId === goal.id && (
                  <GoalActionsMenu
                    open
                    status={goal.lifeCycleStatus}
                    onEdit={() => onEdit(goal)}
                    onArchive={() => onArchive(goal)}
                    onDisable={() => onDisable(goal)}
                    onClose={closeActions}
                  />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {isOpen && (
              <div className="gallo-row-expanded">
                <div className="goal-summary">
                  <strong>Goal:</strong> {goal.goalDetails.goal}
                </div>

                <div className="goal-metric">
                  Metric: {goal.goalDetails.goalMetric} | Min:{" "}
                  {goal.goalDetails.goalValueMin}
                </div>

                <div className="accounts-table">
                  <div className="accounts-header">
                    <div>Account</div>
                    <div>Route</div>
                    <div>Salesperson</div>
                    <div>Status</div>
                  </div>

                  {activeAccounts.map((account, idx) => {
                    const route = Array.isArray(account.salesRouteNums)
                      ? account.salesRouteNums.join(", ")
                      : account.salesRouteNums;

                    const rep =
                      employeeMap[
                        Array.isArray(account.salesRouteNums)
                          ? account.salesRouteNums[0]
                          : account.salesRouteNums
                      ] || "Unknown";

                    return (
                      <div key={idx} className="accounts-row">
                        <div>{account.accountName}</div>
                        <div>{route}</div>
                        <div>{rep}</div>
                        <div>
                          {account.submittedPostId ? (
                            <button
                              className="link-btn"
                              onClick={() =>
                                onViewPostModal(account.submittedPostId!)
                              }
                            >
                              View
                            </button>
                          ) : (
                            <span className="status-pending">
                              Not Submitted
                            </span>
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
}
