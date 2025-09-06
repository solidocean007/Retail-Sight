import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Collapse,
  Box,
  Button,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { CompanyGoalWithIdType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
// import AccountTable from "../AccountTable";
import UserTableForGoals from "../UserTableForGoals";
// import GoalViewerFilters from "../GoalViewerFilters";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import "./companyGoalCard.css";
// import { mapAccountsWithStatus } from "./utils/goalModeUtils";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";

interface CompanyGoalCardProps {
  goal: CompanyGoalWithIdType;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  salesRouteNum?: string; // 🔧 new
  mobile?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>
  ) => void;
  onViewPostModal: (postId: string, target?: HTMLElement) => void;
}

const CompanyGoalCard: React.FC<CompanyGoalCardProps> = ({
  goal,
  salesRouteNum,
  expanded,
  onToggleExpand,
  mobile = false,
  onDelete,
  onEdit,
  onViewPostModal,
}) => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isMobileScreen = useMediaQuery("(max-width: 600px)");
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const activeCompanyUsers = companyUsers.filter((u) => u.status === "active");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [searchTerm, setSearchTerm] = useState("");
  // const [filterSubmitted, setFilterSubmitted] = useState<
  //   "all" | "submitted" | "not-submitted"
  // >("all");

  // ✅ Resolve relevant accounts for this goal
  const effectiveAccounts = useMemo(() => {
    const allMatching = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal?.includes(acc.accountNumber.toString())
    );

    return salesRouteNum
      ? allMatching.filter((acc) =>
          (acc.salesRouteNums || []).includes(salesRouteNum)
        )
      : allMatching;
  }, [allCompanyAccounts, goal.accountNumbersForThisGoal, salesRouteNum]);

  // NEW: when the goal is user-targeted, the assigned users are explicit
  const assignedUserIds = useMemo(() => {
    if (
      goal.targetMode === "goalForSelectedUsers" &&
      goal.userAssignments?.length
    ) {
      return goal.userAssignments;
    }
    // fallback: union of assignment values (legacy)
    return Array.from(
      new Set(Object.values(goal.userAssignments || {}).flat())
    );
  }, [goal]);
  // );

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
      goal.accountNumbersForThisGoal?.includes(acc.accountNumber.toString())
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
    if (goal.targetRole === "supervisor") {
      // Supervisor goal → userAssignments are supervisors
      const assignedSupervisorUids = Object.values(goal.userAssignments || {})
        .flat()
        .filter((uid, i, arr) => arr.indexOf(uid) === i); // dedupe

      return companyUsers.filter((u) => assignedSupervisorUids.includes(u.uid));
    }

    // Sales goal → route-based resolution
    const matchedAccounts = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal?.includes(String(acc.accountNumber))
    );
    const salesRouteNums = new Set(
      matchedAccounts.flatMap((acc) => acc.salesRouteNums || [])
    );
    return companyUsers.filter((u) =>
      salesRouteNums.has(u.salesRouteNum || "")
    );
  }, [goal, companyUsers, allCompanyAccounts]);

  const userBasedRows = useMemo(() => {
    return usersForGoal.map((user) => {
      const isSupervisor = goal.targetRole === "supervisor";

      const userSubmissions = (goal.submittedPosts || []).filter((post) => {
        if (isSupervisor) {
          // Get all reps who report to this supervisor
          const repUids = companyUsers
            .filter((u) => u.reportsTo === user.uid)
            .map((u) => u.uid);
          return repUids.includes(post.submittedBy?.uid || "");
        } else {
          return post.submittedBy?.uid === user.uid;
        }
      });

      const submittedAccountIds = new Set(
        userSubmissions.map((post) => post.account.accountNumber.toString())
      );

      const userAccounts = matchedAccounts.filter((acc) => {
        const accountKey = acc.accountNumber.toString();
        if (isSupervisor) {
          const assignedSupervisors = goal.userAssignments?.[accountKey] || [];
          return assignedSupervisors.includes(user.uid);
        } else {
          const routeNums = acc.salesRouteNums || [];
          return routeNums.includes(user.salesRouteNum || "");
        }
      });

      const unsubmittedAccounts = userAccounts
        .filter((acc) => !submittedAccountIds.has(acc.accountNumber.toString()))
        .map((acc) => ({
          accountName: acc.accountName,
          accountAddress: acc.accountAddress,
          accountNumber: acc.accountNumber.toString(),
        }));

      const submissionCount = userSubmissions.length;
      let completionPercentage = 0;

      if (goal.perUserQuota && goal.perUserQuota > 0) {
        completionPercentage = Math.min(
          Math.round((submissionCount / goal.perUserQuota) * 100),
          100
        );
      } else {
        const totalAccounts = userAccounts.length;
        const submittedCount = totalAccounts - unsubmittedAccounts.length;

        completionPercentage =
          totalAccounts > 0
            ? Math.round((submittedCount / totalAccounts) * 100)
            : 0;
      }

      return {
        uid: user.uid,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        submissions: userSubmissions.map((post) => ({
          postId: post.postId,
          submittedAt: post.submittedAt,
          storeName: post.account.accountName,
        })),
        unsubmittedAccounts,
        userCompletionPercentage: completionPercentage,
      };
    });
  }, [
    usersForGoal,
    goal.submittedPosts,
    goal.perUserQuota,
    companyUsers,
    allCompanyAccounts,
  ]);

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
          <h5>Starts: {goal.goalStartDate}</h5>
          <h5>Ends: {goal.goalEndDate}</h5>
        </div>
        <div className="info-title-row">
          <div className="info-title">{goal.goalTitle}</div>
          {(onDelete && user?.role === "admin") ||
            (user?.role === "super-admin" && (
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete(goal.id);
                  }}
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
            ))}
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
            onClick={(e) => {
              e.stopPropagation(); // ✅ Prevents collapsing the year accidentally
              onToggleExpand(goal.id);
            }}
          >
            {expanded ? "Hide submissions" : "Show submissions"}
          </Button>
        </div>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography variant="h6" sx={{ mt: 2 }}>
          User Progress
        </Typography>
        <UserTableForGoals
          users={userBasedRows}
          goal={goal}
          onViewPostModal={(postId, ref) => onViewPostModal(postId, ref)}
        />
      </Collapse>

      <EditCompanyGoalModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goal={goal}
        allAccounts={allCompanyAccounts}
        companyUsers={activeCompanyUsers}
        onSave={handleGoalUpdate}
      />
    </div>
  );
};

export default CompanyGoalCard;
