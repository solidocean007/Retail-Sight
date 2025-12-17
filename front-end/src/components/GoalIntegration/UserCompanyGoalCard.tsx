import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Tooltip, Typography, Button, Collapse, Box } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { Timestamp, updateDoc } from "firebase/firestore";
import { CompanyGoalWithIdType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectUser } from "../../Slices/userSlice";
import "./companyGoalCard.css";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";
import UserTableForGoals, { UserRowType } from "../UserTableForGoals";

interface Props {
  goal: CompanyGoalWithIdType;
  salesRouteNum: string | undefined;
  mobile: boolean;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  onViewPostModal: (postId: string, ref?: HTMLElement) => void;
}

const UserCompanyGoalCard: React.FC<Props> = ({
  goal,
  salesRouteNum,
  mobile,
  expanded,
  onToggleExpand,
  onViewPostModal,
}) => {
  const user = useSelector(selectUser);
  const allAccounts = useSelector(selectAllCompanyAccounts);
  console.log(goal);
  const userSalesRoute = user?.salesRouteNum;
  const userUid = user?.uid;

  // --- Determine which accounts apply to this goal ---
  const accountNumbersForThisGoal = useMemo(() => {
    if (goal.goalAssignments?.length) {
      return goal.goalAssignments
        .filter((g) => g.uid === userUid)
        .map((g) => g.accountNumber.toString());
    }
    return goal.accountNumbersForThisGoal || [];
  }, [goal.goalAssignments, goal.accountNumbersForThisGoal, userUid]);

  const userAccounts = useMemo(() => {
    const scoped = allAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString())
    );

    // legacy fallback
    if (!goal.goalAssignments?.length && userSalesRoute) {
      return scoped.filter((acc) =>
        (acc.salesRouteNums || []).includes(userSalesRoute)
      );
    }

    return scoped;
  }, [
    allAccounts,
    accountNumbersForThisGoal,
    userSalesRoute,
    goal.goalAssignments,
  ]);

  const totalAccounts = userAccounts.length;

  // --- Submissions for this user ---
  const userSubmissions = useMemo(() => {
    if (!goal.submittedPosts) return [];

    return goal.submittedPosts.filter((p) => {
      const postUid = p.submittedBy?.uid;
      const acctNum = p.account?.accountNumber?.toString();
      return (
        postUid === userUid &&
        acctNum &&
        accountNumbersForThisGoal.includes(acctNum)
      );
    });
  }, [goal.submittedPosts, accountNumbersForThisGoal, userUid]);

  const submittedCount = userSubmissions.length;
  const percentage =
    goal.perUserQuota && goal.perUserQuota > 0
      ? Math.min(100, Math.round((submittedCount / goal.perUserQuota) * 100))
      : totalAccounts > 0
      ? Math.round((submittedCount / totalAccounts) * 100)
      : 0;

  const unsubmittedAccounts = userAccounts.filter(
    (a) =>
      !userSubmissions.some(
        (s) =>
          s.account?.accountNumber?.toString() === a.accountNumber.toString()
      )
  );

  const userRow: UserRowType = {
    uid: userUid || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    isInactive: (user?.status ?? "active") !== "active",
    submissions: userSubmissions.map((p) => ({
      postId: p.postId,
      storeName: p.account?.accountName || "Unknown Store",
      submittedAt:
        p.submittedAt instanceof Timestamp
          ? p.submittedAt.toDate().toISOString()
          : typeof p.submittedAt === "string"
          ? p.submittedAt
          : "",
    })),
    userCompletionPercentage: percentage,
    unsubmittedAccounts: unsubmittedAccounts.map((a) => ({
      accountName: a.accountName,
      accountAddress: a.accountAddress || "",
      accountNumber: a.accountNumber.toString(),
    })),
  };

  return (
    <div className="info-box-company-goal">
      <div className="goal-badge">{goal.targetRole}</div>

      <div className="company-goal-card-start-end">
        <h5>Starts: {goal.goalStartDate}</h5>
        <h5>Ends: {goal.goalEndDate}</h5>
      </div>

      <div className="info-title-row">
        <div className="info-title">{goal.goalTitle}</div>
      </div>

      <div className="info-layout-row">
        <div className="info-description">
          <p>
            Created by: {goal.createdByFirstName} {goal.createdByLastName}
          </p>

          {goal.goalDescription}
          {goal.perUserQuota && (
            <div className="info-quota">
              Requirement: at least {goal.perUserQuota} submission
              {goal.perUserQuota > 1 ? "s" : ""}.
            </div>
          )}
        </div>

        <div className="goal-progress-section">
          <Typography variant="caption">Your Progress</Typography>
          <div className="goal-progress-numbers">
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>{submittedCount} Submissions</span>
              <Tooltip
                title={`${submittedCount} of ${totalAccounts} submitted`}
              >
                <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
              </Tooltip>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className={getCompletionClass(percentage)}>
                {percentage}% Completed
              </span>
              <Tooltip
                title={
                  goal.perUserQuota
                    ? `${percentage}% of required submissions`
                    : `${percentage}% of assigned accounts submitted`
                }
              >
                <InfoIcon fontSize="small" style={{ marginLeft: 4 }} />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      <Box display="flex" justifyContent="flex-end" mt={1}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => onToggleExpand(goal.id)}
        >
          {expanded ? "Hide details" : "Show details"}
        </Button>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography variant="h6" sx={{ mt: 2 }}>
          Account Progress
        </Typography>
        <UserTableForGoals
          users={[userRow]}
          goal={goal}
          onViewPostModal={onViewPostModal}
        />
      </Collapse>
    </div>
  );
};

export default UserCompanyGoalCard;
