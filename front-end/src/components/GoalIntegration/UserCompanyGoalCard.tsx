import { useMemo } from "react";
import { Button, Collapse, Tooltip } from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Timestamp } from "firebase/firestore";
import { useSelector } from "react-redux";

import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectUser } from "../../Slices/userSlice";
import { useGoalAccountReports } from "../../hooks/useGoalAccountReports";
import { CompanyGoalWithIdType } from "../../utils/types";
import { isAssignmentActive } from "../../utils/goalReports/goalAccountRemoval";
import UserTableForGoals, { UserRowType } from "../UserTableForGoals";

import "./userCompanyGoalCard.css";

interface Props {
  goal: CompanyGoalWithIdType;
  salesRouteNum: string | undefined;
  mobile: boolean;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  onViewPostModal: (postId: string, ref?: HTMLElement) => void;
}

const formatDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const UserCompanyGoalCard = ({
  goal,
  mobile,
  expanded,
  onToggleExpand,
  onViewPostModal,
}: Props) => {
  const user = useSelector(selectUser);
  const allAccounts = useSelector(selectAllCompanyAccounts);
  const userSalesRoute = user?.salesRouteNum;
  const userUid = user?.uid;
  const { reports } = useGoalAccountReports(goal.id, expanded);

  const accountNumbersForThisGoal = useMemo(() => {
    if (goal.goalAssignments?.length) {
      return goal.goalAssignments
        .filter((assignment) => assignment.uid === userUid)
        .filter(isAssignmentActive)
        .map((assignment) => assignment.accountNumber.toString());
    }
    return goal.accountNumbersForThisGoal || [];
  }, [goal.accountNumbersForThisGoal, goal.goalAssignments, userUid]);

  const userAccounts = useMemo(() => {
    const scoped = allAccounts.filter((account) =>
      accountNumbersForThisGoal.includes(account.accountNumber.toString()),
    );

    if (!goal.goalAssignments?.length && userSalesRoute) {
      return scoped.filter((account) =>
        (account.salesRouteNums || []).includes(userSalesRoute),
      );
    }

    return scoped;
  }, [
    allAccounts,
    accountNumbersForThisGoal,
    goal.goalAssignments,
    userSalesRoute,
  ]);

  const userSubmissions = useMemo(() => {
    if (!goal.submittedPosts) return [];

    return goal.submittedPosts.filter((post) => {
      const accountNumber = post.account?.accountNumber?.toString();
      return (
        post.submittedBy?.uid === userUid &&
        accountNumber &&
        accountNumbersForThisGoal.includes(accountNumber)
      );
    });
  }, [accountNumbersForThisGoal, goal.submittedPosts, userUid]);

  const totalAccounts = userAccounts.length;
  const submittedCount = userSubmissions.length;
  const percentage =
    goal.perUserQuota && goal.perUserQuota > 0
      ? Math.min(100, Math.round((submittedCount / goal.perUserQuota) * 100))
      : totalAccounts > 0
        ? Math.round((submittedCount / totalAccounts) * 100)
        : 0;
  const progressTone =
    percentage >= 100 ? "complete" : percentage >= 50 ? "steady" : "starting";

  const unsubmittedAccounts = userAccounts.filter(
    (account) =>
      !userSubmissions.some(
        (submission) =>
          submission.account?.accountNumber?.toString() ===
          account.accountNumber.toString(),
      ),
  );

  const userRow: UserRowType = {
    uid: userUid || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    isInactive: (user?.status ?? "active") !== "active",
    submissions: userSubmissions.map((post) => ({
      postId: post.postId,
      storeName: post.account?.accountName || "Unknown Store",
      submittedAt:
        post.submittedAt instanceof Timestamp
          ? post.submittedAt.toDate().toISOString()
          : typeof post.submittedAt === "string"
            ? post.submittedAt
            : "",
    })),
    userCompletionPercentage: percentage,
    unsubmittedAccounts: unsubmittedAccounts.map((account) => ({
      accountName: account.accountName,
      accountAddress: account.accountAddress || "",
      accountNumber: account.accountNumber.toString(),
    })),
  };

  const createdBy =
    `${goal.createdByFirstName ?? ""} ${goal.createdByLastName ?? ""}`.trim();

  return (
    <article
      className={`user-goal-card ${expanded ? "user-goal-card--expanded" : ""} ${
        mobile ? "user-goal-card--mobile" : ""
      }`}
    >
      <div className="user-goal-card__topline">
        <div className="user-goal-card__badges">
          <span className="user-goal-card__status">Active</span>
          <span className="user-goal-card__role">
            {goal.targetRole === "supervisor" ? "Supervisor" : "Sales"}
          </span>
        </div>
        <span className="user-goal-card__dates">
          <CalendarMonthOutlinedIcon />
          {formatDate(goal.goalStartDate)} – {formatDate(goal.goalEndDate)}
        </span>
      </div>

      <div className="user-goal-card__body">
        <div className="user-goal-card__copy">
          <h3>{goal.goalTitle}</h3>
          {createdBy && <span className="user-goal-card__creator">Created by {createdBy}</span>}
          <p>{goal.goalDescription}</p>
          {goal.perUserQuota && goal.perUserQuota > 0 && (
            <span className="user-goal-card__requirement">
              Requirement: {goal.perUserQuota} submission
              {goal.perUserQuota === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="user-goal-card__progress" aria-label={`${percentage}% complete`}>
          <div className="user-goal-card__progress-heading">
            <span>Your progress</span>
            <strong className={`user-goal-card__percentage user-goal-card__percentage--${progressTone}`}>
              {percentage}%
            </strong>
          </div>
          <div className="user-goal-card__progress-track" aria-hidden="true">
            <span
              className={`user-goal-card__progress-fill user-goal-card__progress-fill--${progressTone}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="user-goal-card__metrics">
            <span>
              <strong>{submittedCount}</strong> submitted
            </span>
            <span>
              <strong>{totalAccounts}</strong> stores
              <Tooltip
                title={
                  goal.perUserQuota
                    ? `${submittedCount} submissions toward a quota of ${goal.perUserQuota}`
                    : `${submittedCount} of ${totalAccounts} assigned stores submitted`
                }
              >
                <InfoOutlinedIcon aria-label="Progress calculation" />
              </Tooltip>
            </span>
          </div>
        </div>
      </div>

      {totalAccounts === 0 && (
        <div className="user-goal-card__account-note">
          <StorefrontOutlinedIcon />
          <span>
            This goal is visible to your role, but no stores are directly assigned to your profile.
          </span>
        </div>
      )}

      <div className="user-goal-card__actions">
        <Button
          className="user-goal-card__toggle"
          size="small"
          endIcon={<ExpandMoreOutlinedIcon />}
          onClick={() => onToggleExpand(goal.id)}
          aria-expanded={expanded}
          aria-controls={`goal-details-${goal.id}`}
        >
          {expanded ? "Hide account details" : "View account details"}
        </Button>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div className="user-goal-card__details" id={`goal-details-${goal.id}`}>
          <div className="user-goal-card__details-heading">
            <span>Account progress</span>
            <small>{totalAccounts} assigned stores</small>
          </div>
          <UserTableForGoals
            users={[userRow]}
            goal={goal}
            onViewPostModal={onViewPostModal}
            enableReporting
            reports={reports}
          />
        </div>
      </Collapse>
    </article>
  );
};

export default UserCompanyGoalCard;
