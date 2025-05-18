import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import {
  Typography,
  Collapse,
  Box,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";
import GoalViewerFilters from "../GoalViewerFilters";
import AccountTable from "../AccountTable";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import { selectCompanyUsers } from "../../Slices/userSlice";
import "./companyGoalDetailsCard.css";
import { useDebouncedValue } from "../../hooks/useDebounce";

interface CompanyGoalDetailsCardProps {
  goal: CompanyGoalType;
  mobile?: boolean;
  salesRouteNum?: string | "";
  onDelete?: (id: string) => void;
  onEdit?: (goalId: string, updatedFields: Partial<CompanyGoalType>) => void;
}

const CompanyGoalDetailsCard: React.FC<CompanyGoalDetailsCardProps> = ({
  goal,
  mobile = false,
  salesRouteNum,
  onDelete,
  onEdit,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers) || [];

  const [expanded, setExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("submitted");

  const isUserView = !!salesRouteNum;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (
      goal.targetMode === "goalForAllAccounts" &&
      allCompanyAccounts.length === 0
    ) {
      getAllCompanyAccountsFromIndexedDB().then((fallback) => {
        dispatch(setAllAccounts(fallback));
      });
    }
  }, [goal.targetMode, allCompanyAccounts, dispatch]);

  // Determine effective accounts
  const effectiveAccounts: CompanyAccountType[] = useMemo(() => {
    if (goal.targetMode === "goalForAllAccounts") return allCompanyAccounts;
    if (goal.targetMode === "goalForSelectedAccounts")
      return goal.accounts || [];
    if (
      goal.targetMode === "goalForSelectedUsers" &&
      goal.usersIdsOfGoal?.length
    ) {
      return allCompanyAccounts.filter((account) =>
        account.salesRouteNums?.some((route) =>
          goal.usersIdsOfGoal!.includes(route)
        )
      );
    }
    return [];
  }, [goal, allCompanyAccounts]);

  const { total, submitted, percentage } = useMemo(() => {
    if (
      goal.targetMode === "goalForSelectedUsers" &&
      goal.usersIdsOfGoal?.length
    ) {
      // 🔥 When goal is by USERS, count by user IDs
      const uniqueSubmitters = new Set(
        goal.submittedPosts?.map((p) => p.submittedBy?.uid).filter(Boolean)
      );
      const submittedCount = Array.from(uniqueSubmitters).filter((uid) =>
        goal.usersIdsOfGoal!.includes(uid as string)
      ).length;
      const totalCount = goal.usersIdsOfGoal.length;
      const percent =
        totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
      return {
        total: totalCount,
        submitted: submittedCount,
        percentage: percent,
      };
    }

    // 🔥 Otherwise normal account-based goal
    const submittedCount =
      goal.submittedPosts?.filter((post) =>
        effectiveAccounts.some(
          (acc) => acc.accountNumber === post.account?.accountNumber
        )
      ).length || 0;
    const totalCount = effectiveAccounts.length;
    const percent =
      totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
    return {
      total: totalCount,
      submitted: submittedCount,
      percentage: percent,
    };
  }, [goal, effectiveAccounts]);

  // Apply user-specific filtering if salesRouteNum is provided
  const accountsToRender = useMemo(() => {
    return isUserView
      ? effectiveAccounts.filter((account) =>
          account.salesRouteNums?.includes(salesRouteNum!)
        )
      : effectiveAccounts;
  }, [isUserView, effectiveAccounts, salesRouteNum]);

  // Preprocess submittedPosts into a Map
  const submittedPostsMap = useMemo(() => {
    const map = new Map<string, GoalSubmissionType>();
    goal.submittedPosts?.forEach((post: GoalSubmissionType) => {
      if (post.account?.accountNumber) {
        map.set(post.account.accountNumber, post);
      }
    });
    return map;
  }, [goal.submittedPosts]);

  // Build rows
  const rowsToRender = accountsToRender.map((account) => {
    const foundPost = submittedPostsMap.get(account.accountNumber || "");
    return {
      ...account,
      submittedBy: foundPost?.submittedBy?.firstName ?? null,
      submittedAt: foundPost?.submittedAt || null,
      postId: foundPost?.postId || null,
    };
  });

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

  // Metrics
  // const total = rowsToRender.length;
  // const submitted = rowsToRender.filter((row) => row.postId).length;
  // const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalType>) => {
    if (onEdit && goal.id) {
      onEdit(goal.id, updatedFields);
    }
  };

  const titleText = isUserView ? "My Goal Progress" : "Company Goal Progress";

  if (mobile && isMobileScreen) {
    return (
      <div className="mobile-goal-box">
        <div className="mobile-file-tabs">
          {["Details", "Dates", "Metrics"].map((label, index) => (
            <div
              key={label}
              className={`file-tab ${activeTab === index ? "active-tab" : ""}`}
              onClick={() => setActiveTab(index)}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="mobile-main-box">
          <div className="mobile-content">
            {activeTab === 0 && (
              <>
                <div className="info-item title-bold">
                  <strong>Title:</strong> {goal.goalTitle}
                </div>
                {onDelete && (
                  <div className="top-right-buttons">
                    <div className="goal-delete">
                      <CloseIcon
                        className="delete-button"
                        onClick={() => onDelete(goal.id)}
                        fontSize="small"
                      />
                    </div>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
                <div className="info-item description-label">
                  <div className="description-text">
                    <strong>Description:</strong> {goal.goalDescription}
                  </div>
                </div>
              </>
            )}
            {activeTab === 1 && (
              <>
                <div className="info-item">
                  <strong>Start Date:</strong> {formatDate(goal.goalStartDate)}
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

          <Box px={2} pb={1}>
            <Typography variant="caption" color="textSecondary">
              {titleText}
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

          <div className="mobile-accounts-tab">
            <button
              className={`file-tab ${expanded ? "active-tab" : ""}`}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Close View" : "Show Submissions"}
            </button>
          </div>

          <Collapse
            in={expanded}
            timeout="auto"
            unmountOnExit
            className="expanded-submissions"
          >
            <GoalViewerFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterSubmitted={filterSubmitted}
              setFilterSubmitted={setFilterSubmitted}
            />
            <AccountTable
              accounts={filteredRows}
              navigate={navigate}
              height={isMobileScreen ? 300 : 60}
            />
          </Collapse>
        </div>
      </div>
    );
  }
  console.log("goal", goal);
  // Desktop View
  return (
    <div className="info-box-company-goal">
      {goal.id}

      <div className="info-layout">
        <div className="info-layout-row">
          <div className="info-header">
            <div className="info-title-row">
              <div className="info-title">Title: {goal.goalTitle}</div>
              {onDelete && (
                <div className="top-right-buttons">
                  <div className="goal-delete">
                    <CloseIcon
                      fontSize="small"
                      className="delete-button"
                      onClick={() => onDelete(goal.id)}
                    />
                  </div>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
            <div className="info-description">
              Description: {goal.goalDescription}
            </div>
            {goal.perUserQuota && goal.perUserQuota > 0 && (
              <div className="info-quota">
                <strong>Requirement:</strong> Each assigned user must submit at
                least {goal.perUserQuota}{" "}
                {goal.perUserQuota > 1 ? "submissions" : "submission"}.
              </div>
            )}
          </div>
        </div>

        <Box px={2} pb={1}>
          <Typography variant="caption" color="textSecondary">
            {titleText}
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
      </div>

      <div className="info-layout-row-bottom">
        <div className="info-accounts tab-wrapper">
          <button
            className="tab-submissions"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? `Hide Submissions (${filteredRows.length})`
              : filteredRows.length > 0
              ? `View Submissions (${filteredRows.length})`
              : "No Submissions"}
          </button>
          <div className="tab-filler" />
        </div>
      </div>

      <Collapse
        in={expanded}
        timeout="auto"
        unmountOnExit
        className="expanded-submissions"
      >
        <GoalViewerFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterSubmitted={filterSubmitted}
          setFilterSubmitted={setFilterSubmitted}
        />
        <AccountTable
          accounts={filteredRows}
          navigate={navigate}
          height={500}
          rowHeight={60}
        />
      </Collapse>

      <EditCompanyGoalModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goal={goal}
        allAccounts={allCompanyAccounts}
        companyUsers={companyUsers}
        onSave={handleGoalUpdate}
      />
    </div>
  );
};

export default CompanyGoalDetailsCard;
