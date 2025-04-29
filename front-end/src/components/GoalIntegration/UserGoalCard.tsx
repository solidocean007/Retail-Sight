// UserGoalCard.tsx
import React, { useMemo, useState } from "react";
import { CompanyAccountType, CompanyGoalType, GoalSubmissionType } from "../../utils/types";
import { Typography, Collapse, Box, Tooltip, useMediaQuery } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import GoalViewerFilters from "../GoalViewerFilters";
import AccountTable from "../AccountTable";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import "./companyGoalDetailsCard.css"; // reuse your existing CSS

interface UserGoalCardProps {
  goal: CompanyGoalType;
  userId: string | undefined;
  yourAccountsAssigned: CompanyAccountType[];
}

const UserGoalCard: React.FC<UserGoalCardProps> = ({ goal, userId, yourAccountsAssigned }) => {
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<"all" | "submitted" | "not-submitted">("submitted");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };
  console.log('userId: ', userId)
  // Pull only this user's submissions
  const userSubmissions = useMemo(() => {
    return (goal.submittedPosts || []).filter(
      (post: GoalSubmissionType) => post.submittedBy?.uid === userId
    );
  }, [goal.submittedPosts, userId]);
  console.log(userSubmissions)

  // goalmode is 
  const total = useMemo(() => {
    if (goal.targetMode === "goalForAllAccounts") {
      return yourAccountsAssigned.length; // Accounts tied to this user
    }
  
    if (goal.targetMode === "goalForSelectedAccounts") {
      return selectedAccountsAssigned.length; // Only the selected ones tied to this user
    }
  
    if (goal.targetMode === "goalForSelectedUsers") {
      return 1; // 🔥 For now, 1 submission expected per user
    }
  
    return 0;
  }, [goal, yourAccountsAssigned, selectedAccountsAssigned]);
  
  const submitted = userSubmissions.length;
  const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const rowsToRender = userSubmissions.map((submission) => ({
    accountName: submission.account?.accountName || "N/A",
    accountAddress: submission.account?.accountAddress || "N/A",
    submittedBy: submission.submittedBy?.firstName ?? "Unknown",
    submittedAt: submission.submittedAt || null,
    postId: submission.postId || null,
  }));

  const filteredRows = rowsToRender.filter((row) => {
    const matchesSearch = row.accountName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesFilter =
      filterSubmitted === "all" ||
      (filterSubmitted === "submitted" && row.postId) ||
      (filterSubmitted === "not-submitted" && !row.postId);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="info-box-company-goal">
      <div className="info-layout">
        <div className="info-layout-row">
          <div className="info-header">
            <div className="info-title">Title: {goal.goalTitle}</div>
            <div className="info-description">Description: {goal.goalDescription}</div>
          </div>
        </div>

        <div className="info-layout-row">
          <div className="info-item info-segment">
            <div className="info-metric">Metric: {goal.goalMetric}</div>
            <div className="info-metric">Min Number: {goal.goalValueMin}</div>
          </div>
          <div className="info-item info-segment">
            <div className="info-metric">Start: {formatDate(goal.goalStartDate)}</div>
            <div className="info-metric">End: {formatDate(goal.goalEndDate)}</div>
          </div>
        </div>

        <Box px={2} pb={1}>
          <Typography variant="caption" color="textSecondary">My Goal Progress</Typography>
          <span className="summary-counts">{submitted} / {total} Submitted</span>
          <span className={`summary-percentage ${percentage === 100 ? "complete" : "incomplete"}`}>
            {percentage}%
            <Tooltip title={`${submitted} of ${total} submitted`}>
              <InfoIcon fontSize="small" />
            </Tooltip>
          </span>
        </Box>

        <div className="info-layout-row-bottom">
          <button className="tab-submissions" onClick={() => setExpanded(!expanded)}>
            {expanded
              ? `Hide My Submissions (${filteredRows.length})`
              : filteredRows.length > 0
              ? `View My Submissions (${filteredRows.length})`
              : "No Submissions"}
          </button>
        </div>

        <Collapse in={expanded} timeout="auto" unmountOnExit className="expanded-submissions">
          <GoalViewerFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterSubmitted={filterSubmitted}
            setFilterSubmitted={setFilterSubmitted}
          />
          <AccountTable accounts={filteredRows} navigate={navigate} height={500} rowHeight={60} />
        </Collapse>
      </div>
    </div>
  );
};

export default UserGoalCard;
