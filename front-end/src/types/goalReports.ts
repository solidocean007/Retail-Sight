// src/types/goalReports.ts
//
// Goal account reports — a rep telling us an account didn't work out for a
// goal, and why.
//
// Design notes (see front-end/goal-account-status-design.md):
// - There is NO status field. A record existing means "the rep reported
//   something about this account on this goal." Reasons carry the meaning.
// - Reasons are KEYED, not free strings, so behavior can depend on specific
//   ones (e.g. not_displayable driving account removal) without breaking when
//   a display label is reworded.
// - Logging is always optional. Most accounts will never have a report, by
//   design — that is not a data gap.

export type GoalKind = "company" | "gallo";

/**
 * The one built-in reason list, used everywhere: company goals, Gallo goals,
 * playbook-linked or not. Reps see the same options regardless of goal kind.
 *
 * Keys are permanent. Labels may be reworded freely.
 */
export const REPORT_REASONS = [
  { key: "not_interested", label: "Not interested" },
  { key: "no_room", label: "No room" },
  { key: "not_displayable", label: "Not displayable" },
  { key: "cost_too_much", label: "Cost too much" },
  { key: "other", label: "Other" },
] as const;

export type ReportReasonKey = (typeof REPORT_REASONS)[number]["key"];

/**
 * Help requests — a different intent from reasons.
 *
 * A reason explains why something didn't happen (often terminal: the buyer
 * said no). A help request is an OPEN ask on an account the rep hasn't given
 * up on, and it expects someone to act. The admin queue has to be able to tell
 * "12 accounts declined" from "3 reps are blocked and waiting on me."
 *
 * A record may carry reasons, help requests, or both — "cost too much" plus
 * "need pricing support" is a perfectly normal pairing.
 */
export const HELP_OPTIONS = [
  { key: "help_building", label: "Help building the display" },
  { key: "help_approval", label: "Help getting approval" },
  { key: "help_product", label: "Need product or samples" },
  { key: "help_other", label: "Something else" },
] as const;

export type HelpOptionKey = (typeof HELP_OPTIONS)[number]["key"];

/**
 * Structural reason: the account cannot take a display at all — as opposed to
 * `no_room`, which means no space right now. Referenced by name rather than
 * as a scattered string literal so the removal workflow can't silently break.
 *
 * This is also the reason that should eventually graduate to an account-level
 * declaration outliving any single goal.
 */
export const REASON_NOT_DISPLAYABLE: ReportReasonKey = "not_displayable";

const REASON_LABELS: Record<string, string> = [
  ...REPORT_REASONS,
  ...HELP_OPTIONS,
].reduce(
  (acc, r) => {
    acc[r.key] = r.label;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Resolve a reason or help key to display text. Tolerates unknown keys so that
 * company-defined options (deferred, would be `custom_*`) and any future
 * built-ins don't render as blanks on historical records.
 */
export const getReasonLabel = (key: string): string =>
  REASON_LABELS[key] ?? key;

/**
 * An admin's judgment on a rep's report. Deliberately not a neutral
 * "acknowledged" — the admin has to take a position, because a shrug is what
 * teaches reps that reporting is pointless.
 *
 *  accepted  — the reason stands. Account comes off the goal, completion math
 *              adjusts, and the rep watches it disappear from their list.
 *  follow_up — not accepted. Account STAYS on the goal and is routed to the
 *              rep's supervisor to review with them. Not a rejection aimed at
 *              the rep; a note that someone will talk it through.
 */
export type GoalReportResolution =
  | "accepted"
  | "follow_up"
  /** Supervisor investigated and closed it — account stays on the goal. */
  | "keep_working"
  /** A display was submitted for this account, so the report is moot. */
  | "executed";

export interface GoalAccountReport {
  id: string;
  companyId: string;

  goalKind: GoalKind;
  goalId: string;
  goalTitle?: string; // denormalized for admin lists

  // Account identity. Company goals key on accountNumber; Gallo goals key on
  // oppId and may never have an accountNumber (not every Gallo account
  // matches a Firestore account, and reports are allowed either way).
  accountNumber?: string;
  oppId?: string;
  accountName?: string; // denormalized for display

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  salesRouteNum?: string;

  /** What got in the way. May be empty if this is purely a help request. */
  reasonKeys: string[];
  /** What would unblock the rep. Non-empty means someone should act. */
  helpKeys?: string[];
  /**
   * Who the rep spoke with at the account. Recorded per-report on purpose:
   * buyers change, and the record should say who it was at the time.
   * Third-party personal data — reads stay company-scoped.
   */
  declinedBy?: string;
  note?: string;

  // Admin decision. `resolution` IS rep-facing — they see the outcome.
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: GoalReportResolution | null;
  /** Admin's direction, shown to the supervisor handling the follow-up. */
  resolutionNote?: string | null;

  /**
   * Supervisor's verdict after actually working the account.
   *
   * Confirming reopens the report for the admin (clears `resolvedAt`) rather
   * than introducing a new state — every existing "open" filter, the feedback
   * strip, and the review modal then keep working untouched, and the admin
   * sees it again carrying much stronger evidence than the original report.
   *
   * Supervisors can never remove an account; only admins can. That's the
   * safety property that makes these buttons impossible to misread.
   */
  supervisorConfirmedAt?: string | null;
  supervisorConfirmedBy?: string | null;
  supervisorNote?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type CreateGoalAccountReportInput = {
  companyId: string;

  goalKind: GoalKind;
  goalId: string;
  goalTitle?: string;

  accountNumber?: string;
  oppId?: string;
  accountName?: string;

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  salesRouteNum?: string;

  reasonKeys: string[];
  helpKeys?: string[];
  declinedBy?: string;
  note?: string;
};

/**
 * Deterministic document ID: one report per rep per account per goal.
 * Re-reporting overwrites rather than appending, so there's no "latest wins"
 * ambiguity and no duplicate cleanup. Same approach as per-user notification
 * IDs elsewhere in the project.
 */
export const buildGoalAccountReportId = (input: {
  goalKind: GoalKind;
  goalId: string;
  accountNumber?: string;
  oppId?: string;
  userId: string;
}): string => {
  const accountKey = input.accountNumber ?? input.oppId;

  if (!accountKey) {
    throw new Error(
      "buildGoalAccountReportId requires either accountNumber or oppId",
    );
  }

  return `${input.goalKind}_${input.goalId}_${accountKey}_${input.userId}`;
};

/** True when the rep indicated the account can't take a display at all. */
export const isNotDisplayableReport = (
  report: Pick<GoalAccountReport, "reasonKeys">,
): boolean => report.reasonKeys.includes(REASON_NOT_DISPLAYABLE);

/** Open = an admin hasn't triaged it yet. */
export const isOpenReport = (
  report: Pick<GoalAccountReport, "resolvedAt">,
): boolean => !report.resolvedAt;

/**
 * The rep is asking for something, not just explaining an outcome. These are
 * the records that need an admin to *do* something, so they should sort above
 * plain reports in any queue.
 */
export const isHelpRequest = (
  report: Pick<GoalAccountReport, "helpKeys">,
): boolean => Boolean(report.helpKeys?.length);

/**
 * An admin decided this needs a conversation. These belong in the supervisor's
 * queue and lead the daily digest — the account is still in play.
 */
export const needsFollowUp = (
  report: Pick<GoalAccountReport, "resolution">,
): boolean => report.resolution === "follow_up";

/**
 * A supervisor went out, saw the account, and backed the rep up. Carries more
 * weight than the original report — worth surfacing distinctly to the admin.
 */
export const isSupervisorConfirmed = (
  report: Pick<GoalAccountReport, "supervisorConfirmedAt">,
): boolean => Boolean(report.supervisorConfirmedAt);
