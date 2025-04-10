import React from "react";
import { NavigateFunction } from "react-router-dom";
import "./accountTable.css"; // optional: for styling
import { CompanyAccountType } from "../utils/types";

interface AccountWithStatus extends CompanyAccountType {
  submittedBy: string | null;
  submittedAt: string | null;
  postId: string | null;
}

interface AccountTableProps {
  accounts: AccountWithStatus[];
  navigate: NavigateFunction;
}

const AccountTable: React.FC<AccountTableProps> = ({ accounts, navigate }) => {
  return (
    <div className="account-table-wrapper">
      <table className="account-table">
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
          {accounts.map((acc, index) => (
            <tr key={acc.accountNumber} className={acc.postId ? "submitted" : "not-submitted"}>
              <td>{index + 1}</td>
              <td>{acc.accountName}</td>
              <td>{acc.accountAddress}</td>
              <td>{acc.postId ? "✅ Submitted" : "❌ Not Submitted"}</td>
              <td>{acc.submittedBy || "—"}</td>
              <td>{acc.submittedAt ? new Date(acc.submittedAt).toLocaleString() : "—"}</td>
              <td>
                {acc.postId ? (
                  <button
                    className="view-post-button"
                    onClick={() => navigate(`/user-home-page?postId=${acc.postId}`)}
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

export default AccountTable;
