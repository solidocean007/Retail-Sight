import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Typography,
  Collapse,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Timestamp } from "firebase/firestore";
import { CompanyAccountType, CompanyGoalWithIdType } from "../../utils/types";
import { selectAllCompanyAccounts } from "../../Slices/allAccountsSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import UserTableForGoals, { UserRowType } from "../UserTableForGoals";
import "./companyGoalCard.css";
import "./companyGoalCardLayout.css";
import { getCompletionClass } from "../../utils/helperFunctions/getCompletionClass";
import NewEditCompanyGoalModal from "./NewEditComapnyGoalModal";
import { useGoalAccountReports } from "../../hooks/useGoalAccountReports";
import GoalReportsReviewModal, {
  AccountGroup,
} from "../GoalReports/GoalReportsReviewModal";
import {
  removeAccountsFromCompanyGoal,
  isAssignmentActive,
  isQuotaUnreachable,
} from "../../utils/goalReports/goalAccountRemoval";
import {
  notifyReportDecision,
  resolveGoalAccountReports,
} from "../../utils/goalReports/goalAccountReportHelpers";
import { GoalAccountReport, getReasonLabel } from "../../types/goalReports";

interface CompanyGoalCardProps {
  goal: CompanyGoalWithIdType;
  expanded: boolean;
  onToggleExpand: (goalId: string) => void;
  salesRouteNum?: string;
  mobile: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (
    goalId: string,
    updatedFields: Partial<CompanyGoalWithIdType>,
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
  const [reviewOpen, setReviewOpen] = useState(false);

  // Always live: the unresolved-feedback strip has to render on a COLLAPSED
  // card, so gating this on `expanded` would hide the very thing it exists to
  // surface. One listener per visible goal card, each scoped to a single
  // goalId — cheap at this scale. If a company ever renders hundreds of goals
  // at once, lift this to the parent as a single companyId + unresolved query.
  const { reports } = useGoalAccountReports(goal.id);

  // Summary of what's waiting, so the card answers "is there anything here?"
  // without the admin having to open the review.
  const feedbackSummary = useMemo(() => {
    const open = reports.filter((r) => !r.resolvedAt);
    if (!open.length) return null;

    const accounts = new Set(
      open.map((r) => r.accountNumber ?? r.oppId ?? r.id),
    );
    const helpCount = open.filter((r) => r.helpKeys?.length).length;

    const reasonCounts: Record<string, number> = {};
    open.forEach((r) =>
      r.reasonKeys?.forEach((k) => {
        reasonCounts[k] = (reasonCounts[k] ?? 0) + 1;
      }),
    );

    const topReasons = Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    return {
      accountCount: accounts.size,
      helpCount,
      topReasons,
    };
  }, [reports]);

  // uid → supervisor name, so an admin choosing follow-up can see who it
  // actually reaches before committing.
  const supervisorByUid = useMemo(() => {
    const byUid = new Map(companyUsers.map((u) => [u.uid, u]));
    const map: Record<string, string> = {};

    companyUsers.forEach((u) => {
      const sup = u.reportsTo ? byUid.get(u.reportsTo) : undefined;
      if (sup) {
        map[u.uid] = `${sup.firstName ?? ""} ${sup.lastName ?? ""}`.trim();
      }
    });

    return map;
  }, [companyUsers]);

  // uid → display name, so a supervisor's confirmation can be attributed.
  const nameByUid = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach((u) => {
      map[u.uid] = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    });
    return map;
  }, [companyUsers]);

  // Account keys already removed, so the review can render them as such.
  const removedAccountKeys = useMemo(
    () =>
      (goal.goalAssignments ?? [])
        .filter((a) => !isAssignmentActive(a))
        .map((a) => a.accountNumber.toString()),
    [goal.goalAssignments],
  );

  const actorName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "An admin";

  /**
   * One notification per rep, listing their own accounts — a shared message
   * would name accounts most recipients never touched.
   */
  const notifyByRep = async (
    affected: GoalAccountReport[],
    resolution: "accepted" | "follow_up",
    note?: string,
  ) => {
    if (!user?.uid) return;

    const byRep = new Map<string, string[]>();
    affected.forEach((r) => {
      const names = byRep.get(r.userId) ?? [];
      names.push(r.accountName || r.accountNumber || "an account");
      byRep.set(r.userId, names);
    });

    await Promise.all(
      [...byRep.entries()].map(([targetUserId, accountNames]) =>
        notifyReportDecision({
          actorUserId: user.uid,
          actorName,
          targetUserId,
          goalId: goal.id,
          goalTitle: goal.goalTitle,
          resolution,
          accountNames,
          resolutionNote: note,
        }),
      ),
    );
  };

  /** Not accepted — account stays on the goal, supervisor reviews with the rep. */
  const handleRequestFollowUp = async (reportIds: string[], note: string) => {
    if (!user?.uid || !reportIds.length) return;

    await resolveGoalAccountReports(reportIds, "follow_up", user.uid, note);

    const affected = reports.filter((r) => reportIds.includes(r.id));
    await notifyByRep(affected, "follow_up", note);
  };

  /** Reason stands — account comes off the goal. */
  const handleAccept = async (groups: AccountGroup[]) => {
    if (!user?.uid || !groups.length) return;

    // One write to the goal doc for the whole batch, then mark the reports.
    const targets = groups.flatMap((g) =>
      g.reports
        .filter((r) => r.accountNumber)
        .map((r) => ({
          goalId: goal.id,
          uid: r.userId,
          accountNumber: r.accountNumber as string,
        })),
    );

    await removeAccountsFromCompanyGoal(goal.id, targets, user.uid);

    const reportIds = groups.flatMap((g) =>
      g.reports.filter((r) => !r.resolvedAt).map((r) => r.id),
    );

    await resolveGoalAccountReports(reportIds, "accepted", user.uid);

    const affected = groups.flatMap((g) =>
      g.reports.filter((r) => !r.resolvedAt),
    );
    await notifyByRep(affected, "accepted");
  };

  // --- Unified account list for this goal (new or old) ---
  const accountNumbersForThisGoal = useMemo(() => {
    if (goal.goalAssignments?.length) {
      return Array.from(
        new Set(
          goal.goalAssignments
            // Accounts accepted off the goal are excluded from totals, so the
            // completion percentage measures what's actually still in play
            // rather than punishing a goal for accounts nobody can execute.
            .filter(isAssignmentActive)
            .map((g) => g.accountNumber),
        ),
      );
    }
    return goal.accountNumbersForThisGoal || [];
  }, [goal.goalAssignments, goal.accountNumbersForThisGoal]);

  // --- Accounts directly tied to this goal ---
  const effectiveAccounts = useMemo(() => {
    const baseAccounts = allCompanyAccounts.filter((acc) =>
      accountNumbersForThisGoal.includes(acc.accountNumber.toString()),
    );
    if (salesRouteNum) {
      return baseAccounts.filter((acc) =>
        (acc.salesRouteNums || []).includes(salesRouteNum),
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
          (a) => `${a.uid}-${a.accountNumber.toString()}`,
        ),
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
        acc.accountNumber.toString(),
      );
      return goal.submittedPosts.filter(
        (post) =>
          post.account &&
          userAccounts.includes(post.account.accountNumber?.toString()),
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
      accountNumbersForThisGoal.includes(acc.accountNumber.toString()),
    );

    // 🧩 Step 1 — If salesRouteNum is passed, limit users to that single user
    let scopedUsers = companyUsers;
    if (salesRouteNum) {
      scopedUsers = companyUsers.filter(
        (u) => u.salesRouteNum === salesRouteNum,
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
            assignedAccountNumbers.includes(acc.accountNumber.toString()),
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
            (acc.salesRouteNums || []).includes(u.salesRouteNum || ""),
          );
        } else if (goal.targetRole === "supervisor") {
          const reps = companyUsers.filter(
            (rep) => rep.reportsTo === u.uid && rep.salesRouteNum,
          );
          const repRouteNums = reps.map((r) => r.salesRouteNum);
          accountsForUser = accountsForGoal.filter((acc) =>
            (acc.salesRouteNums || []).some((rn) => repRouteNums.includes(rn)),
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
        (p) => p.submittedBy?.uid === user.uid,
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
          .filter(Boolean),
      );

      const unsubmittedAccounts = accounts
        .filter(
          (acc) => !submittedAccountNums.has(acc.accountNumber.toString()),
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
          Math.round((completed / goal.perUserQuota) * 100),
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

  // One number drives the bar and the label — quota-based when a quota exists,
  // otherwise share of assigned accounts.
  const displayPercentage =
    goal.perUserQuota && !isNaN(percentageOfGoal)
      ? percentageOfGoal
      : percentage;

  /**
   * Reps whose remaining active accounts can no longer reach their quota —
   * usually because accounts were accepted off the goal.
   *
   * Surfaced, never auto-corrected: an admin set that quota deliberately, and
   * silently lowering it would hide the fact that the goal became impossible.
   */
  const unreachableReps = useMemo(() => {
    if (!goal.perUserQuota || !goal.goalAssignments?.length) return [];

    const uids = new Set(goal.goalAssignments.map((a) => a.uid));

    return [...uids]
      .filter((uid) =>
        isQuotaUnreachable(goal.goalAssignments, uid, goal.perUserQuota),
      )
      .map((uid) => {
        const u = companyUsers.find((c) => c.uid === uid);
        return `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim() || "A rep";
      });
  }, [goal.goalAssignments, goal.perUserQuota, companyUsers]);

  const handleGoalUpdate = (updatedFields: Partial<CompanyGoalWithIdType>) => {
    if (onEdit) onEdit(goal.id, updatedFields);
  };

  return (
    <div
      className={`info-box-company-goal ${
        goalIsForSupervisor ? "supervisor-goal" : ""
      }`}
    >
      {/* ── Header: identity and admin actions ───────────────── */}
      <div className="cg-head">
        <div className="cg-head-left">
          {goal.targetRole && (
            <span
              className={`cg-badge ${
                goalIsForSupervisor ? "cg-badge--supervisor" : ""
              }`}
            >
              {goal.targetRole}
            </span>
          )}
          <span className="cg-dates">
            {goal.goalStartDate} &ndash; {goal.goalEndDate}
          </span>
        </div>

        {onDelete &&
          (user?.role === "admin" || user?.role === "super-admin") && (
            <div className="cg-head-actions">
              <Tooltip title="Edit goal">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditModalOpen(true);
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete goal">
                <IconButton
                  size="small"
                  className="cg-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(goal.id);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          )}
      </div>

      <h3 className="cg-title">{goal.goalTitle}</h3>

      {goal.goalDescription && (
        <p className="cg-description">{goal.goalDescription}</p>
      )}

      {/* ── Progress ─────────────────────────────────────────── */}
      <div className="cg-progress">
        <div className="cg-progress-head">
          <div className="cg-metrics">
            <span className="cg-metric-value">{submitted}</span>
            <span className="cg-metric-label">
              submission{submitted === 1 ? "" : "s"}
            </span>
            {total > 0 && (
              <span className="cg-metric-sub">of {total} accounts</span>
            )}
          </div>

          <div className="cg-pct-wrap">
            <span
              className={`cg-pct ${getCompletionClass(displayPercentage)}`}
            >
              {displayPercentage}%
            </span>
            <Tooltip
              title={
                goal.perUserQuota
                  ? `${displayPercentage}% of required submissions completed`
                  : `${displayPercentage}% of ${total} accounts submitted`
              }
            >
              <InfoIcon fontSize="inherit" className="cg-info" />
            </Tooltip>
          </div>
        </div>

        <div className="cg-bar">
          <div
            className={`cg-bar-fill ${getCompletionClass(displayPercentage)}`}
            style={{ width: `${Math.min(100, displayPercentage)}%` }}
          />
        </div>

        {goal.perUserQuota ? (
          <span className="cg-quota">
            Each user needs {goal.perUserQuota} submission
            {goal.perUserQuota > 1 ? "s" : ""}
          </span>
        ) : null}

        {unreachableReps.length > 0 && (
          <span className="cg-quota-warning">
            {unreachableReps.length === 1
              ? `${unreachableReps[0]} has fewer accounts left than the quota of ${goal.perUserQuota}.`
              : `${unreachableReps.length} reps have fewer accounts left than the quota of ${goal.perUserQuota}.`}
          </span>
        )}
      </div>

      {/* ── Unresolved feedback ──────────────────────────────── */}
      {feedbackSummary && (
        <button
          type="button"
          className={`cg-feedback-strip ${
            feedbackSummary.helpCount > 0 ? "needs-help" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setReviewOpen(true);
          }}
        >
          <WarningAmberIcon className="cg-feedback-icon" fontSize="small" />

          <div className="cg-feedback-body">
            <span className="cg-feedback-title">
              {feedbackSummary.helpCount > 0
                ? `${feedbackSummary.helpCount} rep${
                    feedbackSummary.helpCount === 1 ? "" : "s"
                  } waiting on help`
                : "Feedback needs review"}
            </span>

            <span className="cg-feedback-detail">
              {feedbackSummary.accountCount} account
              {feedbackSummary.accountCount === 1 ? "" : "s"}
              {feedbackSummary.topReasons.length > 0 && " · "}
              {feedbackSummary.topReasons
                .map(([key, n]) => `${n} ${getReasonLabel(key).toLowerCase()}`)
                .join(" · ")}
            </span>
          </div>

          <span className="cg-feedback-cta">Review</span>
        </button>
      )}

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="cg-actions">
        <Button
          variant="text"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(goal.id);
          }}
        >
          {expanded ? "Hide submissions" : "Show submissions"}
        </Button>

        <Button
          variant="outlined"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setReviewOpen(true);
          }}
        >
          Feedback
        </Button>
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography className="cg-section-label">User Progress</Typography>
        <UserTableForGoals
          users={userRows}
          goal={goal}
          onViewPostModal={(postId, ref) => onViewPostModal(postId, ref)}
          reports={reports}
          reviewReports
        />
      </Collapse>

      <GoalReportsReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        goalTitle={goal.goalTitle}
        reports={reports}
        removedKeys={removedAccountKeys}
        supervisorByUid={supervisorByUid}
        nameByUid={nameByUid}
        onAccept={handleAccept}
        onRequestFollowUp={handleRequestFollowUp}
      />

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
