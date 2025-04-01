// InfoRowCompanyGoals.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./infoRowCompanyGoal.css";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import { Typography } from "@mui/material";

interface InfoRowCompanyGoalProps {
  goal: CompanyGoalType;
  mobile?: boolean;
  salesRouteNum?: string | "";
  onDelete?: (id: string) => void;
}

type RowRenderType = {
  accountNumber: string;
  accountName: string;
  accountAddress: string;
  postId?: string;
  submittedBy?: string;
  submittedAt?: string;
};

const InfoRowCompanyGoal: React.FC<InfoRowCompanyGoalProps> = ({
  goal,
  mobile = false,
  salesRouteNum,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getRowsToRender = (): RowRenderType[] => {
    if (Array.isArray(goal.accounts) && goal.accounts.length > 0) {
      return goal.accounts.map((account) => {
        const foundPost = goal.submittedPosts?.find(
          (post: GoalSubmissionType) =>
            post.accountNumber === account.accountNumber
        );
        return {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountAddress: account.accountAddress,
          postId: foundPost?.postId,
          submittedBy: foundPost?.submittedBy,
          submittedAt: foundPost?.submittedAt,
        };
      });
    }

    return (
      goal.submittedPosts?.map((post, idx) => ({
        accountNumber: post.accountNumber,
        accountName: `Account ${post.accountNumber}`,
        accountAddress: "N/A",
        postId: post.postId,
        submittedBy: post.submittedBy || "Unknown",
        submittedAt: post.submittedAt || "",
      })) || []
    );
  };

  const rowsToRender = getRowsToRender();

  const handleViewPostClick = (row: RowRenderType) => {
    console.log("Navigating to postId:", row.postId);
    navigate(`/user-home-page?postId=${row.postId}`);
  };

  return (
    <div className={`info-box-company-goal ${mobile ? "mobile-layout" : ""}`}>
      {!mobile && (
        <>
          <div className="info-layout">
            <div className="info-layout-row">
              <div className="info-header">
                <div className="info-title">{`Title: ${goal.goalTitle}`}</div>
                <div className="info-description">{`Description: ${goal.goalDescription}`}</div>
              </div>
              {onDelete && (
                <div className="goal-delete">
                  <button
                    className="delete-button"
                    onClick={() => onDelete(goal.id)}
                  >
                    X
                  </button>
                </div>
              )}
            </div>
            <div className="info-layout-row">
              <div className="info-item info-segment">
                <div className="info-metric">{`Metric: ${goal.goalMetric}`}</div>
                <div className="info-metric">{`Min number: ${goal.goalValueMin}`}</div>
              </div>
              <div className="info-item info-segment">
                <div className="info-metric">{`Start: ${formatDate(
                  goal.goalStartDate
                )}`}</div>
                <div className="info-metric">{`End: ${formatDate(
                  goal.goalEndDate
                )}`}</div>
              </div>
            </div>
          </div>
          <div className="info-layout-row-bottom">
            <div className="info-accounts">
              <button
                className="expand-button"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Hide Submissions" : "Show Submissions"}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="expanded-table">
              <table className="expandable-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Account Name</th>
                    <th>Address</th>
                    <th>Submitted By</th>
                    <th>Submitted At</th>
                    <th>Post Link</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsToRender.map((row, index) => (
                    <tr key={row.accountNumber || index}>
                      <td>{index + 1}</td>
                      <td>{row.accountName}</td>
                      <td>{row.accountAddress}</td>
                      <td>{row.submittedBy || "—"}</td>
                      <td>
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {row.postId ? (
                          <button
                            className="post-link-button"
                            onClick={() => handleViewPostClick(row)}
                          >
                            View Post
                          </button>
                        ) : (
                          "No submitted post"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {mobile && (
        <div className="mobile-goal-box">
          <div className="mobile-main-box">
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
              {onDelete && (
                <div className="delete-button-container">
                  <button
                    className="delete-button"
                    onClick={() => onDelete(goal.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
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
                    <strong>Start Date:</strong>{" "}
                    {formatDate(goal.goalStartDate)}
                  </div>
                  <div className="info-item">
                    <strong>End Date:</strong> {formatDate(goal.goalEndDate)}
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

            <div className="mobile-accounts-tab">
              <button
                className={`file-tab ${expanded ? "active-tab" : ""}`}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? "Close View" : "Show Submissions"}
              </button>
            </div>

            {expanded && (
              <div className="mobile-content">
                <table className="expandable-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Address</th>
                      <th>Submitted By</th>
                      <th>Submitted At</th>
                      <th>Post</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsToRender.map((row, index) => (
                      <tr key={row.accountNumber || index}>
                        <td>{row.accountName}</td>
                        <td>{row.accountAddress}</td>
                        <td>{row.submittedBy || "—"}</td>
                        <td>
                          {row.submittedAt
                            ? new Date(row.submittedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          {row.postId ? (
                            <button
                              className="post-link-button"
                              onClick={() => handleViewPostClick(row)}
                            >
                              View
                            </button>
                          ) : (
                            "None"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoRowCompanyGoal;
