// CompanyGoalDetailsCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import "./companyGoalDetailsCard.css";
import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../utils/types";
import {
  Typography,
  LinearProgress,
  Collapse,
  useMediaQuery,
  Box,
  Button,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GoalViewerFilters from "../GoalViewerFilters";
import { FixedSizeList as List } from "react-window";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../../Slices/allAccountsSlice";
import { getAllCompanyAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import AccountTable from "../AccountTable";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import { selectCompanyUsers } from "../../Slices/userSlice";
import InfoIcon from "@mui/icons-material/Info";

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
  const [expanded, setExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("submitted");
  const [localAccounts, setLocalAccounts] = useState<CompanyAccountType[]>([]);
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");

  console.log("goal:", goal);

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
  }, [goal.targetMode, goal.accounts, goal.usersIdsOfGoal, allCompanyAccounts]);

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalType>) => {
    console.log("Updated fields:", updatedFields);
    if (onEdit && goal.id) {
      onEdit(goal.id, updatedFields); // ⬅️ A spread argument must either have a tuple type or be passed to a rest parameter
    }
  };

  const baseAccounts = (
    goal.appliesToAllAccounts ? localAccounts : goal.accounts || []
  ).filter((acc) =>
    salesRouteNum ? acc.salesRouteNums?.includes(salesRouteNum) : true
  );

  const rowsToRender = effectiveAccounts.map((account) => {
    const foundPost = goal.submittedPosts?.find(
      (post: GoalSubmissionType) => post.accountNumber === account.accountNumber
    );
    return {
      ...account,
      submittedBy: foundPost?.submittedBy || null,
      submittedAt: foundPost?.submittedAt || null,
      postId: foundPost?.postId || null,
    };
  });

  const filteredRows = rowsToRender.filter((row) => {
    const matchesSearch = row.accountName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterSubmitted === "all" ||
      (filterSubmitted === "submitted" && row.postId) ||
      (filterSubmitted === "not-submitted" && !row.postId);
    return matchesSearch && matchesFilter;
  });

  const totalAccounts = rowsToRender.length;
  const submittedCount = rowsToRender.filter((row) => row.postId).length;

  const { total, submitted, percentage } = useMemo(() => {
    if (
      goal.targetMode === "goalForSelectedUsers" &&
      goal.usersIdsOfGoal?.length
    ) {
      const uniqueSubmitters = new Set(
        goal.submittedPosts?.map((p) => p.submittedBy).filter(Boolean)
      );
      const submittedCount = Array.from(uniqueSubmitters).filter((uid) =>
        goal.usersIdsOfGoal!.includes(uid) // Type 'undefined' is not assignable to type 'string'
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
    const submittedCount =
      goal.submittedPosts?.filter((post) =>
        effectiveAccounts.some(
          (acc) => acc.accountNumber === post.accountNumber
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
  }, [
    goal.targetMode,
    goal.usersIdsOfGoal,
    goal.submittedPosts,
    effectiveAccounts,
  ]);

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
                      <button
                        className="delete-button"
                        onClick={() => onDelete(goal.id)}
                      >
                        <CloseIcon fontSize="small" />
                      </button>
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
            {salesRouteNum && (
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mt: 1, mb: 1 }}
              >
                Filtering by route: <strong>{salesRouteNum}</strong>
              </Typography>
            )}
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
            {/* <Typography variant="body2">{`${percentSubmitted}% Submitted`}</Typography>
            <LinearProgress
              variant="determinate"
              value={percentSubmitted}
              color="primary"
            /> */}
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

  return (
    <div className="info-box-company-goal">
      <div className="info-layout">
        <div className="info-layout-row">
          <div className="info-header">
            <div className="info-title-row">
              <div className="info-title">Title: {goal.goalTitle}</div>
              {onDelete && (
                <div className="top-right-buttons">
                  <div className="goal-delete">
                    <button
                      className="delete-button"
                      onClick={() => onDelete(goal.id)}
                    >
                      <CloseIcon fontSize="small" />
                    </button>
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
          </div>
        </div>
        <div className="info-layout-row">
          <div className="info-item info-segment">
            <div className="info-metric">Metric: {goal.goalMetric}</div>
            <div className="info-metric">Min number: {goal.goalValueMin}</div>
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
          {salesRouteNum && (
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mt: 1, mb: 1 }}
            >
              Filtering by route: <strong>{salesRouteNum}</strong>
            </Typography>
          )}
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
          {/* <Typography variant="body2">{`${percentSubmitted}% Submitted`}</Typography>
          <LinearProgress
            variant="determinate"
            value={percentSubmitted}
            color="success"
          /> */}
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
