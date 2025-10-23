import React, { useEffect, useMemo, useState } from "react";
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
import { CompanyAccountType, CompanyGoalWithIdType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
// import AccountTable from "../AccountTable";
import UserTableForGoals, { UserRowType } from "../UserTableForGoals";
// import GoalViewerFilters from "../GoalViewerFilters";
import EditCompanyGoalModal from "./EditCompanyGoalModal";
import "./companyGoalCard.css";
// import { mapAccountsWithStatus } from "./utils/goalModeUtils";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";
import { Timestamp } from "firebase/firestore";

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
  const inactiveUsers = companyUsers.filter((u) => u.status !== "active");

  const goalIsForSupervisor = goal.targetRole === "supervisor";

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    // Sales goals → accounts come from accountNumbersForThisGoal
    const base = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal?.includes(acc.accountNumber.toString())
    );

    if (goalIsForSupervisor) {
      // Supervisor goals → Admins/Superadmins see all accounts,
      // supervisors only see accounts that overlap with their reps
      if (user?.role === "supervisor") {
        const repsReportingToMe = companyUsers.filter(
          (u) => u.reportsTo === user.uid && u.salesRouteNum
        );
        const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);
        return base.filter((acc) =>
          (acc.salesRouteNums || []).some((rn) => myRepsRouteNums.includes(rn))
        );
      }

      if (user?.role === "admin" || user?.role === "super-admin") {
        return base;
      }

      return []; // regular sales shouldn't see supervisor goals
    }

    // Sales goals → if salesRouteNum is provided, filter by that
    return salesRouteNum
      ? base.filter((acc) => (acc.salesRouteNums || []).includes(salesRouteNum))
      : base;
  }, [
    allCompanyAccounts,
    goal.accountNumbersForThisGoal,
    goalIsForSupervisor,
    user?.uid,
    user?.role,
    companyUsers,
    salesRouteNum,
  ]);

  const salesRouteNumsForGoal = useMemo(() => {
    if (salesRouteNum && typeof salesRouteNum === "string") {
      return [salesRouteNum];
    }

    return Array.from(
      new Set(matchedAccounts.flatMap((acc) => acc.salesRouteNums || []))
    );
  }, [matchedAccounts, salesRouteNum]);

  const usersForGoal = useMemo(() => {
    if (!goal.accountNumbersForThisGoal) return [];

    // Get accounts tied to this goal
    const accountsForGoal = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal?.includes(acc.accountNumber.toString())
    );

    // 🔹 Sales goals
    if (goal.targetRole === "sales") {
      return companyUsers.filter((u) =>
        accountsForGoal.some((acc) =>
          (acc.salesRouteNums || []).includes(u.salesRouteNum || "")
        )
      );
    }

    // 🔹 Supervisor goals
    if (goal.targetRole === "supervisor") {
      // Supervisors who manage reps tied to these accounts
      const repsForGoal = companyUsers.filter((u) =>
        accountsForGoal.some((acc) =>
          (acc.salesRouteNums || []).includes(u.salesRouteNum || "")
        )
      );

      const supervisorUids = new Set(
        repsForGoal.map((r) => r.reportsTo).filter(Boolean)
      );
      return companyUsers.filter((u) => supervisorUids.has(u.uid));
    }

    return [];
  }, [
    goal.accountNumbersForThisGoal,
    goal.targetRole,
    allCompanyAccounts,
    companyUsers,
  ]);

  const userBasedRows = useMemo(() => {
    if (!goal.accountNumbersForThisGoal) return [];

    // Accounts tied to this goal
    const accountsForGoal = allCompanyAccounts.filter((acc) =>
      goal.accountNumbersForThisGoal?.includes(acc.accountNumber.toString())
    );

    // If a specific salesRouteNum is passed → filter just that user
    if (salesRouteNum) {
      const currentUser = companyUsers.find(
        (u) => u.salesRouteNum === salesRouteNum
      );
      if (!currentUser) return [];

      const accountsForUser =
        goal.targetRole === "sales"
          ? accountsForGoal.filter((acc) =>
              (acc.salesRouteNums || []).includes(salesRouteNum)
            )
          : accountsForGoal.filter((acc) =>
              (acc.salesRouteNums || []).some((rn) =>
                companyUsers.some(
                  (rep) =>
                    rep.salesRouteNum === rn &&
                    rep.reportsTo === currentUser.uid
                )
              )
            );

      return [{ user: currentUser, accounts: accountsForUser }];
    }

    // Default: build rows for all relevant users
    return usersForGoal.map((u) => {
      let accountsForUser: CompanyAccountType[] = [];

      if (goal.targetRole === "sales") {
        accountsForUser = accountsForGoal.filter((acc) =>
          (acc.salesRouteNums || []).includes(u.salesRouteNum || "")
        );
      } else if (goal.targetRole === "supervisor") {
        const reps = companyUsers.filter(
          (rep) => rep.reportsTo === u.uid && rep.salesRouteNum
        );
        const repRouteNums = reps.map((r) => r.salesRouteNum);
        accountsForUser = accountsForGoal.filter((acc) =>
          (acc.salesRouteNums || []).some((rn) => repRouteNums.includes(rn))
        );
      }

      return { user: u, accounts: accountsForUser };
    });
  }, [
    goal.accountNumbersForThisGoal,
    goal.targetRole,
    allCompanyAccounts,
    usersForGoal,
    companyUsers,
    salesRouteNum,
  ]);

  const userRows: UserRowType[] = userBasedRows.map(({ user, accounts }) => {
    const postsForUser = (goal.submittedPosts || []).filter(
      (p) => p.submittedBy?.uid === user.uid
    );

    const submissions = postsForUser.map((p) => ({
      postId: p.postId,
      storeName: p.account?.accountName || "Unknown Store",
      submittedAt:
        typeof p.submittedAt === "string"
          ? p.submittedAt
          : p.submittedAt instanceof Timestamp
          ? p.submittedAt.toDate().toISOString()
          : "",
    }));

    const submittedAccountNums = new Set(
      postsForUser
        .map((p) => p.account?.accountNumber?.toString())
        .filter(Boolean) // remove undefined/null
    );

    const unsubmittedAccounts = accounts
      .filter((acc) => !submittedAccountNums.has(acc.accountNumber.toString()))
      .map((acc) => ({
        accountName: acc.accountName,
        accountAddress: acc.accountAddress || "",
        accountNumber: acc.accountNumber.toString(),
      }));

    const total = accounts.length;
    const completed = submissions.length;
    const userCompletionPercentage =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      uid: user.uid,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      isInactive: (user.status ?? "active") !== "active",
      submissions,
      userCompletionPercentage,
      unsubmittedAccounts,
    };
  });

  const percentageOfGoal =
    goal.perUserQuota && salesRouteNumsForGoal.length > 0
      ? Math.round(
          (submitted / (salesRouteNumsForGoal.length * goal.perUserQuota)) * 100
        )
      : 0;

  return (
    <div
      className={`info-box-company-goal ${
        goalIsForSupervisor ? "supervisor-goal" : ""
      }`}
    >
      {goal.targetRole && (
        <div
          className={`goal-badge ${
            goalIsForSupervisor ? `badge--supervisor` : ""
          }`}
        >
          {goal.targetRole} goal
        </div>
      )}

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
          users={userRows}
          goal={goal}
          onViewPostModal={(postId, ref) => onViewPostModal(postId, ref)}
        />
      </Collapse>

      {isEditModalOpen && (
        <EditCompanyGoalModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          goal={goal}
          allAccounts={allCompanyAccounts}
          companyUsers={activeCompanyUsers}
          onSave={handleGoalUpdate}
        />
      )}
    </div>
  );
};

export default CompanyGoalCard;
