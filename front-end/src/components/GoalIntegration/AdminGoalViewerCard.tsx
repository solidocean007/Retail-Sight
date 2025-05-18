import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./adminGoalViewerCard.css";
import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { CompanyAccountType, CompanyGoalType } from "../../utils/types";
import { selectCompanyUsers } from "../../Slices/userSlice";
import { calculateSubmissionStats, getEffectiveAccounts, mapAccountsWithStatus } from "./utils/goalModeUtils";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { setAllAccounts } from "../../Slices/allAccountsSlice";
import GoalViewerFilters from "../GoalViewerFilters";
import UserTableForGoals from "../UserTableForGoals";
import AccountTable from "../AccountTable";

interface AdminGoalViewerProps {
  goal: CompanyGoalType;
  isExpanded: boolean;
  toggleExpand: () => void;
  allCompanyAccounts: CompanyAccountType[];
}

const AdminGoalViewerCard: React.FC<AdminGoalViewerProps> = ({
  goal,
  isExpanded,
  toggleExpand,
  allCompanyAccounts,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("all");
  const companyUsers = useSelector(selectCompanyUsers) || [];

  // 🔍 Memoized account list based on targetMode
  const effectiveAccounts = useMemo(
    () => getEffectiveAccounts(goal, allCompanyAccounts),
    [goal, allCompanyAccounts],
  );

  // 📊 Memoized submission statistics
  const { total, submitted, percentage } = useMemo(
    () => calculateSubmissionStats(goal, effectiveAccounts),
    [goal, effectiveAccounts],
  );

  // 🧠 Add status to accounts
  const accountsWithStatus = useMemo(
    () => mapAccountsWithStatus(goal, effectiveAccounts),
    [goal, effectiveAccounts],
  );

  // 🔄 Fallback for account cache
  useEffect(() => {
    if (allCompanyAccounts.length === 0) {
      getAllCompanyAccountsFromIndexedDB().then((fallbackAccounts) => {
        dispatch(setAllAccounts(fallbackAccounts));
      });
    }
  }, [allCompanyAccounts, dispatch]);

  const userBasedRows = useMemo(() => {
    if (goal.targetMode !== "goalForSelectedUsers") return [];

    return companyUsers // company users is possibly null which is kinda impossible seeing that you would be a company user
      .filter((u) => goal.usersIdsOfGoal?.includes(u.uid))
      .map((user) => {
        const matchingPost = goal.submittedPosts?.find(
          (post) => post.submittedBy === user.uid,
        );

        return {
          uid: user.uid,
          displayName: `${user.firstName} ${user.lastName}`,
          submittedAt: matchingPost?.submittedAt || null,
          postId: matchingPost?.postId || null,
        };
      });
  }, [goal, companyUsers]);

  return (
    <div className="admin-goal-summary-card">
      <div className="summary-header">
        <div className="summary-title">{goal.goalTitle}</div>
        <div className="summary-details">
          <span className="summary-counts">
            {submitted} / {total} Submitted
          </span>
          <span
            className={`summary-percentage ${
              percentage === 100 ? "complete" : "incomplete"
            }`}
          >
            {percentage}%
            <Tooltip title={`${submitted} of ${total} submitted`}>
              <InfoIcon fontSize="small" />
            </Tooltip>
          </span>
          <button className="expand-toggle" onClick={toggleExpand}>
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="admin-goal-viewer-card">
          <h2>Goal: {goal.goalTitle}</h2>
          <p>{goal.goalDescription}</p>

          <GoalViewerFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterSubmitted={filterSubmitted}
            setFilterSubmitted={setFilterSubmitted}
          />

          {goal.targetMode === "goalForSelectedUsers" ? (
            <UserTableForGoals users={userBasedRows} />
          ) : (
            <AccountTable
              accounts={accountsWithStatus}
              navigate={navigate}
              height={500}
              rowHeight={60}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGoalViewerCard;
