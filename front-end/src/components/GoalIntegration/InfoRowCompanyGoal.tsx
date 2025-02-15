import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation
import "./infoRowCompanyGoal.css";
import { CompanyAccountType, CompanyGoalType } from "../../utils/types";

interface InfoRowCompanyGoalProps {
  key: number;
  goal: CompanyGoalType;
  mobile?: boolean;
  onDelete?: (id: string) => void;
}

const InfoRowCompanyGoal: React.FC<InfoRowCompanyGoalProps> = ({
  key,
  goal,
  mobile = false,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate(); // Hook to navigate

  const hasSubmittedPosts = goal.submittedPosts && goal.submittedPosts.length > 0;
  const isExpandable = Array.isArray(goal.accounts) && goal.accounts.length > 0;

  return (
    <div key={key} className={`info-row-company-goal ${mobile ? "mobile-layout" : ""}`}>
      {/* 📌 Desktop View */}
      {!mobile && (
        <>
          <div className="info-grid">
            <div className="info-item">{goal.goalTitle}</div>
            <div className="info-item">{goal.goalDescription}</div>
            <div className="info-item">{goal.goalMetric}</div>
            <div className="info-item">{goal.goalStartDate}</div>
            <div className="info-item">{goal.goalEndDate}</div>
            <div className="info-item">
              {isExpandable ? (
                <button className="expand-button" onClick={() => setExpanded(!expanded)}>
                  {expanded ? "Hide" : "Show"}
                </button>
              ) : (
                "Global"
              )}
            </div>
            <div className="info-item">
              {onDelete && (
                <button className="delete-button" onClick={() => onDelete(goal.id)}>
                  Delete
                </button>
              )}
            </div>
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
                    {goal.accounts.map((account: CompanyAccountType, index: number) => (
                      <tr key={account.accountNumber}>
                        <td>{index + 1}</td>
                        <td>{account.accountName}</td>
                        <td>{account.accountAddress}</td>
                        <td>
                          {hasSubmittedPosts ? (
                            <button
                              className="post-link-button"
                              onClick={() => navigate(`/user-home-page?postId=${goal.submittedPosts?.[0]?.id}`)}
                            >
                              View Post
                            </button>
                          ) : (
                            "No submitted posts"
                          )}
                        </td>
                      </tr>
                    ))}
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
        <>
          <div className="mobile-file-tabs">
            {["General", "Dates", "Info", "Accounts"].map((label, index) => (
              <button
                key={label}
                className={`file-tab ${activeTab === index ? "active-tab" : ""}`}
                onClick={() => setActiveTab(index)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mobile-content">
            {activeTab === 0 && (
              <>
                <div className="info-item"><strong>Title:</strong> {goal.goalTitle}</div>
                <div className="info-item"><strong>Description:</strong> {goal.goalDescription}</div>
              </>
            )}
            {activeTab === 1 && (
              <>
                <div className="info-item"><strong>Start Date:</strong> {goal.goalStartDate}</div>
                <div className="info-item"><strong>End Date:</strong> {goal.goalEndDate}</div>
              </>
            )}
            {activeTab === 2 && (
              <>
                <div className="info-item"><strong>Metric:</strong> {goal.goalMetric}</div>
                <div className="info-item"><strong>Has Posts:</strong> {hasSubmittedPosts ? "Yes" : "No"}</div>
              </>
            )}
            {activeTab === 3 && (
              isExpandable ? (
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
                    {goal.accounts.map((account: CompanyAccountType, index: number) => (
                      <tr key={account.accountNumber}>
                        <td>{index + 1}</td>
                        <td>{account.accountName}</td>
                        <td>{account.accountAddress}</td>
                        <td>
                          {hasSubmittedPosts ? (
                            <button
                              className="post-link-button"
                              onClick={() => navigate(`/user-home-page?postId=${goal.submittedPosts?.[0]?.id}`)}
                            >
                              View Post
                            </button>
                          ) : (
                            "No submitted posts"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="info-item">Global</div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InfoRowCompanyGoal;

