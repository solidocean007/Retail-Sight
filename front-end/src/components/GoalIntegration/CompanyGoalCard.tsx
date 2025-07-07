import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
import { CompanyGoalWithIdType, CompanyAccountType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectCompanyUsers } from "../../Slices/userSlice";
import AccountTable from "../AccountTable";
import UserTableForGoals from "../UserTableForGoals";
import GoalViewerFilters from "../GoalViewerFilters";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import "./companyGoalCard.css";
import { mapAccountsWithStatus } from "./utils/goalModeUtils";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";
import { selectUserAccounts } from "../../Slices/userAccountsSlice";

interface CompanyGoalCardProps {
  goal: CompanyGoalWithIdType;
  salesRouteNum?: string; // 🔧 new
  mobile?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
}

const CompanyGoalCard: React.FC<CompanyGoalCardProps> = ({
  goal,
  salesRouteNum,
  mobile = false,
  onDelete,
  onEdit,
}) => {
  const navigate = useNavigate();
  const isMobileScreen = useMediaQuery("(max-width: 600px)");
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers) || [];

  const [expanded, setExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubmitted, setFilterSubmitted] = useState<
    "all" | "submitted" | "not-submitted"
  >("all");

  // ✅ Resolve relevant accounts for this goal
  const effectiveAccounts = useMemo(() => {
    const allMatching = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );

    return salesRouteNum
      ? allMatching.filter((acc) =>
          (acc.salesRouteNums || []).includes(salesRouteNum)
        )
      : allMatching;
  }, [allCompanyAccounts, goal.accountNumbersForThisGoal, salesRouteNum]);

  const accountsWithStatus = useMemo(
    () => mapAccountsWithStatus(goal, effectiveAccounts),
    [goal, effectiveAccounts]
  );

  const filteredAccountsWithStatus = useMemo(
    () =>
      accountsWithStatus.filter((account) => {
        const matchesSearch =
          account.accountName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          account.accountNumber.toString().includes(searchTerm);

        const hasSubmitted = !!account.postId; // 👈 derive dynamically

        const matchesFilter =
          filterSubmitted === "all" ||
          (filterSubmitted === "submitted" && hasSubmitted) ||
          (filterSubmitted === "not-submitted" && !hasSubmitted);

        return matchesSearch && matchesFilter;
      }),
    [accountsWithStatus, searchTerm, filterSubmitted]
  );

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalWithIdType>) => {
    if (onEdit) onEdit(goal.id, updatedFields);
  };

  const total = effectiveAccounts.length;

  const submitted = useMemo(() => {
    if (!goal.submittedPosts) return 0;

    if (salesRouteNum) {
      const userAccounts = effectiveAccounts.map((acc) =>
        acc.accountNumber.toString()
      );

      return goal.submittedPosts.filter(
        (post) =>
          post.account &&
          userAccounts.includes(post.account.accountNumber?.toString())
      ).length;
    }

    return goal.submittedPosts.length;
  }, [goal.submittedPosts, salesRouteNum, effectiveAccounts]); // this is rendering 48 now.  i had 44 in firestore then i edited 4 now i think i may have duplicates.  

  const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

  const matchedAccounts = useMemo(() => {
    const base = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );

    return salesRouteNum
      ? base.filter((acc) => (acc.salesRouteNums || []).includes(salesRouteNum))
      : base;
  }, [allCompanyAccounts, goal.accountNumbersForThisGoal, salesRouteNum]);

  const salesRouteNumsForGoal = useMemo(() => {
    if (salesRouteNum && typeof salesRouteNum === "string") {
      return [salesRouteNum];
    }

    return Array.from(
      new Set(matchedAccounts.flatMap((acc) => acc.salesRouteNums || []))
    );
  }, [matchedAccounts, salesRouteNum]);

  const usersForGoal = useMemo(() => {
    const routeFiltered = companyUsers.filter((user) =>
      salesRouteNumsForGoal.includes(user.salesRouteNum || "")
    );
    return salesRouteNum
      ? routeFiltered.filter((u) => u.salesRouteNum === salesRouteNum)
      : routeFiltered;
  }, [companyUsers, salesRouteNum, salesRouteNumsForGoal]);

  const userBasedRows = useMemo(() => {
    return usersForGoal.map((user) => {
      const userSubmissions = (goal.submittedPosts || []).filter(
        (post) => post.submittedBy?.uid === user.uid
      );

      const submissionCount = userSubmissions.length;
      const quota = goal.perUserQuota || 1;
      const completionPercentage = Math.min(
        Math.round((submissionCount / quota) * 100),
        100
      );

      return {
        uid: user.uid,
        firstName: user.firstName || "", // ✅ ensure it's a string
        lastName: user.lastName || "", // ✅ ensure it's a string
        submissions: userSubmissions.map((post) => ({
          postId: post.postId,
          submittedAt: post.submittedAt,
          storeName: post.account.accountName,
        })),
        userCompletionPercentage: completionPercentage,
      };
    });
  }, [usersForGoal, goal.submittedPosts, goal.perUserQuota]);

  const percentageOfGoal =
    goal.perUserQuota && salesRouteNumsForGoal.length > 0
      ? Math.round(
          (submitted / (salesRouteNumsForGoal.length * goal.perUserQuota)) * 100
        )
      : 0;

  return (
    <div className="info-box-company-goal">
      <div className="company-goal-card-header">
        <div className="company-goal-card-start-end">
          <h5>Start: {goal.goalStartDate}</h5>
          <h5>End: {goal.goalStartDate}</h5>
        </div>
        <div className="info-title-row">
          <div className="info-title">{goal.goalTitle}</div>
          {onDelete && (
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                className="delete-button"
                onClick={() => onDelete(goal.id)}
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsEditModalOpen(true)}
              >
                Edit
              </Button>
            </Box>
          )}
        </div>
      </div>
      <div className="info-layout-row">
        <div className="info-layout">
          <div className="info-description">
            {goal.goalDescription}
            {goal.perUserQuota && (
              <div className="info-quota">
                Requirement: Each user must submit at least {goal.perUserQuota}{" "}
                submission{goal.perUserQuota > 1 ? "s" : ""}.
              </div>
            )}
          </div>
        </div>
        <div className="goal-progress-section">
          <Typography variant="caption">Goal Progress</Typography>

          {/* <div className={isMobileScreen ? "left" : "right"} mt={1}> */}
          <div className="goal-progress-numbers">
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{submitted} Total Submissions</span>
              <Tooltip title={`${submitted} of ${total} submitted`}>
                <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
              </Tooltip>
            </div>

            {!goal.perUserQuota && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span className={getCompletionClass(percentage)}>
                  {percentage}% Complete
                </span>
                <Tooltip
                  title={`${percentage}% of ${total} accounts submitted`}
                >
                  <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
                </Tooltip>
              </div>
            )}

            {goal.perUserQuota && !isNaN(percentageOfGoal) && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span className={getCompletionClass(percentageOfGoal)}>
                  {percentageOfGoal}% Complete
                </span>
                <Tooltip
                  title={`${percentageOfGoal}% of required submissions completed`}
                >
                  <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
                </Tooltip>
              </div>
            )}
          </div>
        </div>
        <div className="info-layout-row-bottom">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide submissions" : "Show submissions"}
          </Button>
        </div>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography variant="h6" sx={{ mt: 2 }}>
          User Progress
        </Typography>
        <UserTableForGoals users={userBasedRows} goal={goal}/> 
        <Typography variant="h6" sx={{ mt: 2 }}>
          Account Progress
        </Typography>
        <GoalViewerFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterSubmitted={filterSubmitted}
          setFilterSubmitted={setFilterSubmitted}
        />
        <AccountTable
          accounts={filteredAccountsWithStatus}
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

export default CompanyGoalCard;
