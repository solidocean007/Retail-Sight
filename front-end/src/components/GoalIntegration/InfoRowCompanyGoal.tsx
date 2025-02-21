import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import "./infoRowCompanyGoal.css";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import { Typography } from "@mui/material";

interface InfoRowCompanyGoalProps {
  key: number;
  goal: CompanyGoalType;
  mobile?: boolean;
  salesRouteNum?: string | "";
  onDelete?: (id: string) => void;
}

const InfoRowCompanyGoal: React.FC<InfoRowCompanyGoalProps> = ({
  key,
  goal,
  mobile = false,
  salesRouteNum,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate(); // Hook to navigate

  const isExpandable = Array.isArray(goal.accounts) && goal.accounts.length > 0;

  // 🔍 Function to find if an account has a submitted post
  const getSubmittedPostId = (accountNumber: string): string | null => {
    const foundPost = goal.submittedPosts?.find(
      (post: GoalSubmissionType) => post.accountNumber === accountNumber
    );
    return foundPost ? foundPost.postId : null;
  };

  // ✅ Condition to determine if we're showing all accounts or only the user's accounts
  const filteredAccounts = () => {
    if (!salesRouteNum) return goal.accounts; // Show all accounts if salesRouteNum is NOT passed
    if (!Array.isArray(goal.accounts)) return []; // Handle global accounts case

    return goal.accounts.filter((account) =>
      Array.isArray(account.salesRouteNums)
        ? account.salesRouteNums.includes(salesRouteNum || "")
        : account.salesRouteNums === salesRouteNum
    );
  };

  return (
    <div
      key={key}
      className={`info-box-company-goal ${mobile ? "mobile-layout" : ""}`}
    >
      {/* 📌 Desktop View */}
      {!mobile && (
        <>
          <div className="info-layout">
            <div className="info-layout-row">
              <div className="info-header">
                <div className="info-title">{`Title: ${goal.goalTitle}`}</div>
                <div className="info-description">{`Description: ${goal.goalDescription}`}</div>
              </div>

              <div className="goal-delete">
                {onDelete && (
                  <button
                    className="delete-button"
                    onClick={() => onDelete(goal.id)}
                  >
                    X
                  </button>
                )}
              </div>
            </div>
            <div className="info-layout-row">
              <div className="info-item info-segment">
                <div className="info-metric">{`Metric: ${goal.goalMetric}`}</div>
                <div className="info-metric">{`min number: ${goal.goalValueMin}`}</div>
              </div>
              <div className="info-item info-segment">
                <div className="info-metric">{`Start: ${goal.goalStartDate}`}</div>
                <div className="info-metric">{`End: ${goal.goalEndDate}`}</div>
              </div>
            </div>
          </div>
          <div className="info-layout-row-bottom">
            <div className="info-accounts">
              {isExpandable ? (
                <button
                  className="expand-button"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Hide Accounts" : "Show Accounts"}
                </button>
              ) : (
                <Typography variant="h6">available for all accounts</Typography>
              )}
            </div>
            <div className="layout-bottom-middle"></div>
          </div>

          {/* 📌 Expandable Accounts Table */}
          {expanded && (
            <div className="expanded-table">
              {isExpandable ? (
                <table className="expandable-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Account Name</th>
                      <th>Address</th>
                      <th>Post Link</th>
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(goal.accounts) &&
                      goal.accounts.map(
                        (account: CompanyAccountType, index: number) => {
                          const postId = getSubmittedPostId(
                            account.accountNumber
                          );
                          return (
                            <tr key={account.accountNumber}>
                              <td>{index + 1}</td>
                              <td>{account.accountName}</td>
                              <td>{account.accountAddress}</td>
                              <td>
                                {postId ? (
                                  <button
                                    className="post-link-button"
                                    onClick={() =>
                                      navigate(
                                        `/user-home-page?postId=${postId}`
                                      )
                                    }
                                  >
                                    View Post
                                  </button>
                                ) : (
                                  "No submitted posts"
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                  </tbody>
                </table>
              ) : (
                <div className="info-item">Global</div>
              )}
            </div>
          )}
        </>
      )}

      {/* 📌 Mobile View */}
      {mobile && (
        <div className="mobile-goal-box">
          <div className="mobile-main-box">
            {/* Mobile Top Tabs */}
            <div className="mobile-file-tabs">
              {["Name", "Dates", "Metrics"].map((label, index) => (
                <button
                  key={label}
                  className={`file-tab ${
                    activeTab === index ? "active-tab" : ""
                  }`}
                  onClick={() => setActiveTab(index)}
                >
                  {label}
                </button>
              ))}
              {/* Mobile Delete Button */}
              <div className="delete-button-container">
                {onDelete && (
                  <button
                    className="delete-button"
                    onClick={() => onDelete(goal.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="mobile-content">
              {activeTab === 0 && (
                <>
                  <div className="info-item">
                    <strong>Title:</strong> {goal.goalTitle}
                  </div>
                  <div className="info-item">
                    <strong>Description:</strong> {goal.goalDescription}
                  </div>
                </>
              )}
              {activeTab === 1 && (
                <>
                  <div className="info-item">
                    <strong>Start Date:</strong> {goal.goalStartDate}
                  </div>
                  <div className="info-item">
                    <strong>End Date:</strong> {goal.goalEndDate}
                  </div>
                </>
              )}
              {activeTab === 2 && (
                <>
                  <div className="info-item">
                    <strong>Metric:</strong> {goal.goalMetric}
                  </div>
                  <div className="info-item">
                    <strong>Min number:</strong> {goal.goalValueMin}
                  </div>
                </>
              )}
            </div>

            {expanded && (
              <div className="mobile-content">
                <tbody>
                  {Array.isArray(goal.accounts) &&
                    filteredAccounts.map(
                      (account: CompanyAccountType, index: number) => {
                        const postId = getSubmittedPostId(
                          account.accountNumber
                        );
                        return (
                          <tr key={index}>
                            <tr>
                              {/* <td>{index + 1}</td> */}
                              <td>{account.accountName}</td>
                            </tr>
                            <tr>
                              <td>{account.accountAddress}</td>
                            </tr>
                            <tr></tr>

                            <td>
                              {postId ? (
                                <button
                                  className="post-link-button"
                                  onClick={() =>
                                    navigate(`/user-home-page?postId=${postId}`)
                                  }
                                >
                                  View Post
                                </button>
                              ) : (
                                "No submitted posts"
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                </tbody>
              </div>
            )}
          </div>
          <div className="mobile-accounts-tab">
            <button
              className={`file-tab ${expanded ? "active-tab" : ""}`}
              onClick={() => setExpanded(!expanded)}
            >
              Accounts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoRowCompanyGoal;
