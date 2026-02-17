import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Collapse,
  Box,
  Button,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Timestamp } from "firebase/firestore";
import { CompanyAccountType, CompanyGoalWithIdType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import UserTableForGoals, { UserRowType } from "../UserTableForGoals";
import "./companyGoalCard.css";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";
import NewEditCompanyGoalModal from "./NewEditComapnyGoalModal";

interface CompanyGoalCardProps {
  goal: CompanyGoalWithIdType;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  salesRouteNum?: string;
  mobile: boolean;
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
  const user = useSelector(selectUser);
  const allCompanyAccounts = useSelector(selectAllCompanyAccounts);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const activeCompanyUsers = companyUsers.filter((u) => u.status === "active");
  const goalIsForSupervisor = goal.targetRole === "supervisor";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  console.log(goal)

  // --- Unified account list for this goal (new or old) ---
  const accountNumbersForThisGoal = useMemo(() => {
    if (goal.goalAssignments?.length) {
      return Array.from(
        new Set(goal.goalAssignments.map((g) => g.accountNumber))
      );
    }
    return goal.accountNumbersForThisGoal || [];
  }, [goal.goalAssignments, goal.accountNumbersForThisGoal]);

  // --- Accounts directly tied to this goal ---
  const effectiveAccounts = useMemo(() => {
    const baseAccounts = allCompanyAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );
    if (salesRouteNum) {
      return baseAccounts.filter((acc) =>
        (acc.salesRouteNums || []).includes(salesRouteNum)
      );
    }
    return baseAccounts;
  }, [allCompanyAccounts, accountNumbersForThisGoal, salesRouteNum]);

  const total = effectiveAccounts.length;

  // --- Submissions ---
  const submitted = useMemo(() => {
    if (!goal.submittedPosts) return 0;

    if (goal.goalAssignments?.length) {
      // Filter posts whose (uid, accountNumber) pair matches any assignment
      const validPairs = new Set(
        goal.goalAssignments.map(
          (a) => `${a.uid}-${a.accountNumber.toString()}`
        )
      );
      return goal.submittedPosts.filter((p) => {
        const postUid = p.submittedBy?.uid;
        const acct = p.account?.accountNumber?.toString();
        return postUid && acct && validPairs.has(`${postUid}-${acct}`);
      }).length;
    }

    // Fallback legacy
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
  }, [
    goal.submittedPosts,
    goal.goalAssignments,
    salesRouteNum,
    effectiveAccounts,
  ]);

  const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

  // --- Build user rows ---
  // 🧩 Build user+account mappings (modern and legacy)
  const userBasedRows = useMemo(() => {
    const usingAssignments =
      Array.isArray(goal.goalAssignments) && goal.goalAssignments.length > 0;

    const accountsForGoal = allCompanyAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );

    // 🧩 Step 1 — If salesRouteNum is passed, limit users to that single user
    let scopedUsers = companyUsers;
    if (salesRouteNum) {
      scopedUsers = companyUsers.filter(
        (u) => u.salesRouteNum === salesRouteNum
      );
    }

    // 🆕 Modern model
    if (usingAssignments) {
      return scopedUsers
        .filter((u) => goal.goalAssignments!.some((g) => g.uid === u.uid))
        .map((u) => {
          const assignedAccountNumbers = goal
            .goalAssignments!.filter((g) => g.uid === u.uid)
            .map((g) => g.accountNumber.toString());
          const accountsForUser = allCompanyAccounts.filter((acc) =>
            assignedAccountNumbers.includes(acc.accountNumber.toString())
          );
          return { user: u, accounts: accountsForUser };
        });
    }

    // 🕰 Legacy model
    if (!accountsForGoal.length) return [];

    const legacyUserRows = scopedUsers
      .map((u) => {
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
      })
      .filter(({ accounts }) => accounts.length > 0);

    return legacyUserRows;
  }, [
    goal.goalAssignments,
    companyUsers,
    allCompanyAccounts,
    accountNumbersForThisGoal,
    goal.targetRole,
    salesRouteNum, // ✅ re-run when viewing single user
  ]);

  // 🧩 Build final UserTableForGoals rows
  const userRows: UserRowType[] = useMemo(() => {
    return userBasedRows.map(({ user, accounts }) => {
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
          .filter(Boolean)
      );

      const unsubmittedAccounts = accounts
        .filter(
          (acc) => !submittedAccountNums.has(acc.accountNumber.toString())
        )
        .map((acc) => ({
          accountName: acc.accountName,
          accountAddress: acc.accountAddress || "",
          accountNumber: acc.accountNumber.toString(),
        }));

      const total = accounts.length;
      const completed = submissions.length;

      let userCompletionPercentage = 0;

      // 🎯 If goal has per-user quota, use that as completion basis
      if (goal.perUserQuota && goal.perUserQuota > 0) {
        userCompletionPercentage = Math.min(
          100,
          Math.round((completed / goal.perUserQuota) * 100)
        );
      } else {
        // fallback: percentage of assigned accounts
        userCompletionPercentage =
          total > 0 ? Math.round((completed / total) * 100) : 0;
      }

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
  }, [userBasedRows, goal.submittedPosts]);

  // ✅ More accurate per-user quota progress
  const percentageOfGoal = useMemo(() => {
    const quota = goal.perUserQuota ?? 0;
    if (quota <= 0 || userRows.length === 0) return 0;

    const ratios = userRows.map((r) => {
      const completed = Math.min(r.submissions.length, quota);
      return completed / quota;
    });

    const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / userRows.length;
    return Math.round(avgRatio * 100);
  }, [goal.perUserQuota, userRows]);

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalWithIdType>) => {
    if (onEdit) onEdit(goal.id, updatedFields);
  };

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
          <h3>Starts: {goal.goalStartDate}</h3>
          <h3>Ends: {goal.goalEndDate}</h3>
        </div>
        <div className="info-title-row">
          <div className="info-title">{goal.goalTitle}</div>
          {onDelete &&
            (user?.role === "admin" || user?.role === "super-admin") && (
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(goal.id);
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
              e.stopPropagation();
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
        <NewEditCompanyGoalModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          goal={goal}
          onSave={handleGoalUpdate}
        />
      )}
    </div>
  );
};

export default CompanyGoalCard;
