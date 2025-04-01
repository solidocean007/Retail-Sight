// AdminGoalViewer.tsx
import React from "react";
// import "./adminGoalViewer.css";
import { useNavigate } from "react-router-dom";
import { CompanyGoalType, GoalSubmissionType } from "../utils/types";

interface AdminGoalViewerProps {
  goal: CompanyGoalType;
}

const AdminGoalViewer: React.FC<AdminGoalViewerProps> = ({ goal }) => {
  const navigate = useNavigate();

  const getAccountsWithStatus = () => {
    return goal.accounts.map((account) => {
      const found = goal.submittedPosts?.find(
        (post: GoalSubmissionType) => post.accountNumber === account.accountNumber
      );
      return {
        ...account,
        submittedBy: found?.submittedBy || null,
        submittedAt: found?.submittedAt || null,
        postId: found?.postId || null,
      };
    });
  };

  const accounts = getAccountsWithStatus();

  return (
    <div className="admin-goal-viewer">
      <h2>Goal: {goal.goalTitle}</h2>
      <p>{goal.goalDescription}</p>
      <table className="admin-goal-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Account</th>
            <th>Address</th>
            <th>Status</th>
            <th>Submitted By</th>
            <th>Submitted At</th>
            <th>Post</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc, i) => (
            <tr key={acc.accountNumber} className={acc.postId ? "submitted" : "not-submitted"}>
              <td>{i + 1}</td>
              <td>{acc.accountName}</td>
              <td>{acc.accountAddress}</td>
              <td>{acc.postId ? "✅ Submitted" : "❌ Not Submitted"}</td>
              <td>{acc.submittedBy || "—"}</td>
              <td>{acc.submittedAt ? new Date(acc.submittedAt).toLocaleString() : "—"}</td>
              <td>
                {acc.postId ? (
                  <button
                    onClick={() => navigate(`/user-home-page?postId=${acc.postId}`)}
                    className="view-post-button"
                  >
                    View Post
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminGoalViewer;