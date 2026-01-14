import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./userTableForGoals.css";
import { getCompletionClass } from "../utils/helperFunctions/getCompletionClass";
import { CompanyGoalWithIdType, GoalAssignmentType } from "../utils/types";

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
}

const UserTableForGoals: React.FC<Props> = ({
  users,
  goal,
  onViewPostModal,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  type SortMode = "completion-desc" | "completion-asc" | "alphabetical";
  const [sortMode, setSortMode] = useState<SortMode>("completion-desc");

  // 🧩 Build a quick lookup for assignments per user (if new model)
  const assignmentsByUser = useMemo(() => {
    const map: Record<string, string[]> = {};
    (goal.goalAssignments || []).forEach((a: GoalAssignmentType) => {
      if (!map[a.uid]) map[a.uid] = [];
      map[a.uid].push(a.accountNumber);
    });
    return map;
  }, [goal.goalAssignments]);

  const handleViewGoalPost = (postId: string, ref: HTMLElement) => {
    onViewPostModal(postId, ref);
  };

  const sortedFilteredUsers = useMemo(() => {
    const filtered = users.filter((u) =>
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortMode === "completion-desc") {
        return b.userCompletionPercentage - a.userCompletionPercentage;
      }
      if (sortMode === "completion-asc") {
        return a.userCompletionPercentage - b.userCompletionPercentage;
      }
      // Alphabetical by last, then first
      const aLast = a.lastName || "";
      const bLast = b.lastName || "";
      const aFirst = a.firstName || "";
      const bFirst = b.firstName || "";
      return aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);
    });
  }, [users, searchTerm, sortMode]);

  return (
    <div>
      <div className="user-table-head">
        <div className="user-table-search">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: "8px", padding: "4px", width: "100%" }}
          />
        </div>
        <div className="user-table-filter">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ marginBottom: "8px", marginLeft: "8px" }}
          >
            <option value="completion-desc">Completion ↓</option>
            <option value="completion-asc">Completion ↑</option>
            <option value="alphabetical">Alphabetical (Last Name)</option>
          </select>
        </div>
      </div>
      <div className="user-table-wrapper">
        <table className="user-table">
          <tbody>
            {sortedFilteredUsers.map((user, idx) => {
              const assignedAccounts = assignmentsByUser[user.uid] || [];

              return (
                <tr key={user.uid}>
                  <td className="user-table-count">{idx + 1}</td>
                  <td>
                    <div className="user-info-cell">
                      <div className="user-name-cell">
                        {user.isInactive ? (
                          <span className="inactive-label">
                            Inactive user (accounts need reassignment)
                          </span>
                        ) : (
                          `${user.lastName}, ${user.firstName}`
                        )}
                      </div>

                      <span
                        className={`completion-pill ${
                          user.userCompletionPercentage >= 90
                            ? "high"
                            : user.userCompletionPercentage >= 50
                            ? "mid"
                            : "low"
                        }`}
                      >
                        {user.userCompletionPercentage}%
                      </span>
                    </div>

                    {/* Show submissions */}
                    <div className="submissions-wrapper">
                      {user.submissions.length > 0 ? (
                        user.submissions.map((sub, subIdx) => (
                          <div key={subIdx} className="submission-item">
                            <div className="store-name">{sub.storeName}</div>
                            <div className="submitted-at">
                              {new Date(sub.submittedAt).toLocaleString()}
                            </div>
                            <button
                              onClick={(e) =>
                                handleViewGoalPost(sub.postId, e.currentTarget)
                              }
                            >
                              View
                            </button>
                          </div>
                        ))
                      ) : (
                        <div>— No submissions</div>
                      )}
                    </div>

                    {/* Expandable unsubmitted accounts */}
                    {user.unsubmittedAccounts.length > 0 && (
                      <details className="unsubmitted-details">
                        <summary
                          className="unsubmitted-summary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {user.unsubmittedAccounts.length} unsubmitted account
                          {user.unsubmittedAccounts.length > 1 ? "s" : ""}
                        </summary>
                        <ul className="unsubmitted-list">
                          {user.unsubmittedAccounts.map((acc) => (
                            <li key={acc.accountNumber}>
                              <strong>{acc.accountName}</strong> —{" "}
                              {acc.accountAddress || "No address"}
                              {assignedAccounts.length > 0 &&
                                assignedAccounts.includes(
                                  acc.accountNumber
                                ) && (
                                  <span className="assigned-indicator">
                                    {" "}
                                    (Assigned)
                                  </span>
                                )}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {/* Optional: show assigned account count */}
                    {goal.goalAssignments?.length && goal.goalAssignments?.length > 0 && (
                      <div className="assigned-count">
                        {assignedAccounts.length > 0 ? (
                          <span>
                            Assigned to{" "}
                            <strong>{assignedAccounts.length}</strong> account
                            {assignedAccounts.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="no-assignment">
                            No assigned accounts
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserTableForGoals;
