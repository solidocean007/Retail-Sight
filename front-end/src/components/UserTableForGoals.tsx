import { useMemo, useState } from "react";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { GoalAccountReport } from "../types/goalReports";
import { CompanyGoalWithIdType, GoalAssignmentType } from "../utils/types";
import AccountReportAction from "./GoalReports/AccountReportAction";
import AccountReportsFlag from "./GoalReports/AccountReportsFlag";

import "./userTableForGoals.css";

export interface UserRowType {
  uid: string;
  firstName: string;
  lastName: string;
  isInactive: boolean;
  submissions: {
    postId: string;
    storeName: string;
    submittedAt: string;
  }[];
  userCompletionPercentage: number;
  unsubmittedAccounts: {
    accountName: string;
    accountAddress: string;
    accountNumber: string;
  }[];
}

interface Props {
  users: UserRowType[];
  goal: CompanyGoalWithIdType;
  onViewPostModal: (postId: string, target?: HTMLElement) => void;
  enableReporting?: boolean;
  reports?: GoalAccountReport[];
  onReportSaved?: () => void;
  reviewReports?: boolean;
  onAcknowledgeReports?: (reportIds: string[]) => Promise<void>;
}

type SortMode = "completion-desc" | "completion-asc" | "alphabetical";

const formatSubmissionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const UserTableForGoals = ({
  users,
  goal,
  onViewPostModal,
  enableReporting = false,
  reports = [],
  onReportSaved,
  reviewReports = false,
  onAcknowledgeReports,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("completion-desc");

  const assignmentsByUser = useMemo(() => {
    const assignments: Record<string, string[]> = {};
    (goal.goalAssignments || []).forEach((assignment: GoalAssignmentType) => {
      assignments[assignment.uid] ??= [];
      assignments[assignment.uid].push(assignment.accountNumber);
    });
    return assignments;
  }, [goal.goalAssignments]);

  const sortedFilteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = users.filter((user) =>
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(normalizedSearch),
    );

    return filtered.sort((a, b) => {
      if (sortMode === "completion-desc") {
        return b.userCompletionPercentage - a.userCompletionPercentage;
      }
      if (sortMode === "completion-asc") {
        return a.userCompletionPercentage - b.userCompletionPercentage;
      }
      return (
        (a.lastName || "").localeCompare(b.lastName || "") ||
        (a.firstName || "").localeCompare(b.firstName || "")
      );
    });
  }, [searchTerm, sortMode, users]);

  return (
    <section className="goal-users-panel" aria-label="Goal submissions and assigned accounts">
      {users.length > 1 && (
        <div className="goal-users-toolbar">
          <label className="goal-users-search">
            <SearchOutlinedIcon aria-hidden="true" />
            <span className="goal-users-visually-hidden">Search users</span>
            <input
              type="search"
              placeholder="Search users"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label className="goal-users-sort">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="completion-desc">Highest completion</option>
              <option value="completion-asc">Lowest completion</option>
              <option value="alphabetical">Last name A–Z</option>
            </select>
          </label>
        </div>
      )}

      <div className="goal-user-list">
        {sortedFilteredUsers.length === 0 && (
          <div className="goal-users-empty" role="status">
            No users match that search.
          </div>
        )}

        {sortedFilteredUsers.map((user, index) => {
          const assignedAccounts = assignmentsByUser[user.uid] || [];
          const completionTone =
            user.userCompletionPercentage >= 90
              ? "high"
              : user.userCompletionPercentage >= 50
                ? "mid"
                : "low";
          const displayName =
            `${user.firstName} ${user.lastName}`.trim() || "Unnamed user";

          return (
            <article className="goal-user-row" key={user.uid}>
              <header className="goal-user-row__header">
                <span className="goal-user-row__index" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="goal-user-row__identity">
                  <strong>{displayName}</strong>
                  {user.isInactive && (
                    <span className="goal-user-row__inactive">
                      Inactive · accounts need reassignment
                    </span>
                  )}
                </div>
                <span className={`goal-completion-pill goal-completion-pill--${completionTone}`}>
                  {user.userCompletionPercentage}% complete
                </span>
              </header>

              <div className="goal-submissions-section">
                <div className="goal-submissions-section__heading">
                  <div>
                    <span>Submissions</span>
                    <small>Photos attached to this goal</small>
                  </div>
                  <strong>{user.submissions.length}</strong>
                </div>

                {user.submissions.length > 0 ? (
                  <div className="goal-submission-list">
                    {user.submissions.map((submission, submissionIndex) => (
                      <div
                        key={`${submission.postId}-${submissionIndex}`}
                        className="goal-submission-item"
                      >
                        <span className="goal-submission-item__icon" aria-hidden="true">
                          <StorefrontOutlinedIcon />
                        </span>
                        <div className="goal-submission-item__copy">
                          <strong>{submission.storeName}</strong>
                          <span>{formatSubmissionDate(submission.submittedAt)}</span>
                        </div>
                        <button
                          type="button"
                          className="goal-submission-view"
                          onClick={(event) =>
                            onViewPostModal(submission.postId, event.currentTarget)
                          }
                        >
                          <VisibilityOutlinedIcon />
                          View post
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="goal-submissions-empty">
                    <span className="goal-submissions-empty__icon" aria-hidden="true">
                      <StorefrontOutlinedIcon />
                    </span>
                    <div>
                      <strong>No submissions yet</strong>
                      <span>Completed store posts will appear here.</span>
                    </div>
                  </div>
                )}
              </div>

              {user.unsubmittedAccounts.length > 0 && (
                <details className="unsubmitted-details">
                  <summary className="unsubmitted-summary">
                    <span>
                      <strong>Needs submission</strong>
                      <small>Assigned stores without a completed post</small>
                    </span>
                    <span className="unsubmitted-summary__count">
                      {user.unsubmittedAccounts.length}
                    </span>
                    <ExpandMoreOutlinedIcon aria-hidden="true" />
                  </summary>
                  <ul className="unsubmitted-list">
                    {user.unsubmittedAccounts.map((account) => (
                      <li key={account.accountNumber}>
                        <div className="unsubmitted-account-copy">
                          <div className="unsubmitted-account-name">
                            {account.accountName}
                            {assignedAccounts.includes(account.accountNumber) && (
                              <span className="assigned-indicator">Assigned</span>
                            )}
                            {reviewReports && (
                              <AccountReportsFlag
                                accountName={account.accountName}
                                reports={reports.filter(
                                  (report) =>
                                    report.accountNumber === account.accountNumber &&
                                    report.userId === user.uid,
                                )}
                                onAcknowledge={onAcknowledgeReports}
                              />
                            )}
                          </div>
                          <div className="unsubmitted-account-address">
                            {account.accountAddress || "No address available"}
                          </div>
                        </div>
                        {enableReporting && (
                          <AccountReportAction
                            goalKind="company"
                            goalId={goal.id}
                            goalTitle={goal.goalTitle}
                            accountNumber={account.accountNumber}
                            accountName={account.accountName}
                            existingReport={reports.find(
                              (report) =>
                                report.accountNumber === account.accountNumber &&
                                report.userId === user.uid,
                            )}
                            onSaved={onReportSaved}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {goal.goalAssignments && goal.goalAssignments.length > 0 && (
                <footer className="goal-user-row__footer">
                  {assignedAccounts.length > 0 ? (
                    <span>
                      <strong>{assignedAccounts.length}</strong> assigned account
                      {assignedAccounts.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="goal-user-row__no-assignment">
                      No accounts assigned to this user
                    </span>
                  )}
                </footer>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default UserTableForGoals;
