import React from "react";
import { Virtuoso } from "react-virtuoso";
import { NavigateFunction } from "react-router-dom";
import { CompanyAccountType, UserType } from "../utils/types";
import "./accountTable.css";

interface AccountWithStatus extends CompanyAccountType {
  submittedBy: UserType | null;
  submittedAt: string | null;
  postId: string | null;
}

interface AccountTableProps {
  accounts: AccountWithStatus[];
  navigate: NavigateFunction;
  height?: number;
  rowHeight?: number;
  salesRouteNum?: string;
}

const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  navigate,
  height = 500,
  rowHeight = 60,
  salesRouteNum,
}) => {
  return (
    <div className="account-list-wrapper">
      <div className="account-list-scrollable">
        <div className="account-table-header">
          <div className="account-small-cell">#</div>
          <div className="account-cell name-cell">Account</div>
          <div className="account-cell address-cell">Address</div>
          <div className="account-small-cell">Status</div>
          {salesRouteNum && (
            <div className="account-cell submitted-by-cell">Submitted By</div>
          )}
          <div className="account-cell submitted-at-cell">Submitted At</div>
          <div className="account-small-cell">Post</div>
        </div>

        <Virtuoso
          style={{
            height: Math.min(accounts.length * rowHeight, height),
            width: "100%",
          }}
          totalCount={accounts.length}
          itemContent={(index) => {
            const acc = accounts[index];

            return (
              <div
                className={`account-row ${
                  acc.postId ? "submitted" : "not-submitted"
                }`}
              >
                <div className="account-small-cell">{index + 1}</div>
                <div className="account-cell name-cell">{acc.accountName}</div>
                <div className="account-cell address-cell">
                  {acc.accountAddress}
                </div>
                <div className="account-small-cell">
                  {acc.postId ? "✅" : "❌"}
                </div>

                {salesRouteNum && (
                  <div className="account-cell submitted-by-cell">
                    {acc.submittedBy
                      ? `${acc.submittedBy.firstName} ${acc.submittedBy.lastName}`
                      : "—"}
                  </div>
                )}

                <div className="account-cell submitted-at-cell">
                  {acc.submittedAt
                    ? new Date(acc.submittedAt).toLocaleString()
                    : "—"}
                </div>

                <div className="account-small-cell">
                  {acc.postId ? (
                    <button
                      className="view-post-button"
                      onClick={() => {
                        navigate("/user-home-page", {
                          state: { postIdToScroll: acc.postId },
                        });
                      }}
                      title="View Post"
                      aria-label="View Post"
                    >
                      View Post
                    </button>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default AccountTable;
