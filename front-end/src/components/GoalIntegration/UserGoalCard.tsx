import React, { useMemo, useState, useEffect } from "react";
import {
  CompanyGoalType,
  CompanyAccountType,
  GoalSubmissionType,
} from "../../utils/types";
import {
  Typography,
  Collapse,
  Box,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import GoalViewerFilters from "../GoalViewerFilters";
import AccountTable from "../AccountTable";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils"; // 🔥 Import this
import "./companyGoalDetailsCard.css";
import "./userGoalCard.css";

interface UserGoalCardProps {
  goal: CompanyGoalType;
  userUid: string | undefined; // 🔥 Change to userUid
}

const UserGoalCard: React.FC<UserGoalCardProps> = ({ goal, userUid }) => {
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");

  const [userAccounts, setUserAccounts] = useState<CompanyAccountType[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("submitted");

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // 🔥 Load user's assigned accounts from IndexedDB when component mounts
  useEffect(() => {
    const loadUserAccounts = async () => {
      try {
        const accounts = await getUserAccountsFromIndexedDB();
        setUserAccounts(accounts);
      } catch (error) {
        console.error("Failed to load user accounts from IndexedDB:", error);
      }
    };
    loadUserAccounts();
  }, []);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const userSubmissions = useMemo(() => {
    return (goal.submittedPosts || []).filter(
      (post: GoalSubmissionType) => post.submittedBy?.uid === userUid
    );
  }, [goal.submittedPosts, userUid]);

  const total = useMemo(() => {
    if (goal.targetMode === "goalForAllAccounts") {
      return userAccounts.length;
    }
    if (goal.targetMode === "goalForSelectedAccounts") {
      return userAccounts.filter((acc) =>
        goal.accounts?.some(
          (goalAcc) => goalAcc.accountNumber === acc.accountNumber
        )
      ).length;
    }
    if (goal.targetMode === "goalForSelectedUsers") {
      return 1; // 🔥 For now, always 1
    }
    return 0;
  }, [goal, userAccounts]);

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
    const matchesSearch = row.accountName
      ?.toLowerCase()
      .includes(debouncedSearchTerm.toLowerCase());
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
            <div className="info-description">
              Description: {goal.goalDescription}
            </div>
          </div>
        </div>

        <div className="info-layout-row">
          <div className="info-item info-segment">
            <div className="info-metric">Metric: {goal.goalMetric}</div>
            <div className="info-metric">Min Number: {goal.goalValueMin}</div>
          </div>
          <div className="info-item info-segment">
            <div className="info-metric">
              Start: {formatDate(goal.goalStartDate)}
            </div>
            <div className="info-metric">
              End: {formatDate(goal.goalEndDate)}
            </div>
          </div>
        </div>

        <Box px={2} pb={1}>
          <Typography variant="caption" color="textSecondary">
            My Goal Progress
          </Typography>
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
        </Box>

        <div className="info-layout-row-bottom">
          <button
            className="tab-submissions"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? `Close (${filteredRows.length})`
              : filteredRows.length > 0
              ? `Open (${filteredRows.length})`
              : "No Submissions"}
          </button>
        </div>

        <Collapse
          in={expanded}
          timeout="auto"
          unmountOnExit
          className="expanded-submissions"
        >
          {/* <GoalViewerFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterSubmitted={filterSubmitted}
            setFilterSubmitted={setFilterSubmitted}
          /> */}
          <div className="submission-card-list">
            {filteredRows.length === 0 ? (
              <div style={{ padding: "0.5rem" }}>No submissions found.</div>
            ) : (
              filteredRows.map((row, index) => (
                <div key={index} className="submission-card">
                  <div className="submission-card-top">
                    <strong>#{index + 1}</strong> — {row.accountName}
                  </div>
                  <div className="submission-card-body">
                    <div className="submission-line">
                      <strong>Address:</strong> {row.accountAddress}
                    </div>
                    <div className="submission-line">
                      <strong>Status:</strong>{" "}
                      {row.postId ? "✅ Submitted" : "❌ Not Submitted"}
                    </div>
                    <div className="submission-line">
                      <strong>Submitted By:</strong> {row.submittedBy ?? "—"}
                    </div>
                    <div className="submission-line">
                      <strong>Submitted At:</strong>{" "}
                      {row.submittedAt
                        ? new Date(row.submittedAt).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                  <div className="submission-card-footer">
                    {row.postId ? (
                      <button
                        className="view-post-button"
                        onClick={() =>
                          navigate(`/user-home-page?postId=${row.postId}`)
                        }
                      >
                        View Post
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "#888" }}>
                        No post yet
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* <AccountTable
            accounts={filteredRows}
            navigate={navigate}
            height={500}
            rowHeight={60}
          /> */}
        </Collapse>
      </div>
    </div>
  );
};

export default UserGoalCard;
