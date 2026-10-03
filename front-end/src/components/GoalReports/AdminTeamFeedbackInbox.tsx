import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { showMessage } from "../../Slices/snackbarSlice";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { selectAllGalloGoals } from "../../Slices/galloGoalsSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import {
  GoalAccountReport,
  getReasonLabel,
  isHelpRequest,
} from "../../types/goalReports";
import {
  notifyReportDecision,
  resolveGoalAccountReports,
  subscribeToCompanyGoalAccountReports,
} from "../../utils/goalReports/goalAccountReportHelpers";
import {
  isAssignmentActive,
  removeAccountsFromCompanyGoal,
  setGalloAccountStatus,
} from "../../utils/goalReports/goalAccountRemoval";
import { useAppDispatch } from "../../utils/store";
import GoalReportsReviewModal, {
  AccountGroup,
} from "./GoalReportsReviewModal";

type AdminQueueFilter =
  | "needs_review"
  | "help"
  | "routed"
  | "returned"
  | "resolved"
  | "all";

type GoalFeedbackGroup = {
  goalId: string;
  title: string;
  kind: GoalAccountReport["goalKind"];
  reports: GoalAccountReport[];
  openCount: number;
  helpCount: number;
  routedCount: number;
  returnedCount: number;
  newestAt: string;
};

const reportTimestamp = (report: GoalAccountReport) =>
  report.updatedAt || report.createdAt;

const reportAge = (report: GoalAccountReport) => {
  const time = new Date(reportTimestamp(report)).getTime();
  if (Number.isNaN(time)) return "Recently updated";
  const days = Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
  if (days === 0) return "Updated today";
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
};

const matchesFilter = (
  report: GoalAccountReport,
  filter: AdminQueueFilter,
) => {
  const returned = Boolean(report.supervisorConfirmedAt) && !report.resolvedAt;
  const needsReview = !report.resolvedAt && !returned;

  switch (filter) {
    case "needs_review":
      return needsReview;
    case "help":
      return !report.resolvedAt && isHelpRequest(report);
    case "routed":
      return report.resolution === "follow_up";
    case "returned":
      return returned;
    case "resolved":
      return Boolean(report.resolvedAt) && report.resolution !== "follow_up";
    default:
      return true;
  }
};

const buildGoalGroups = (reports: GoalAccountReport[]): GoalFeedbackGroup[] => {
  const grouped = new Map<string, GoalAccountReport[]>();
  reports.forEach((report) => {
    grouped.set(report.goalId, [...(grouped.get(report.goalId) ?? []), report]);
  });

  return [...grouped.entries()]
    .map(([goalId, list]) => {
      const sorted = [...list].sort(
        (a, b) =>
          new Date(reportTimestamp(b)).getTime() -
          new Date(reportTimestamp(a)).getTime(),
      );
      return {
        goalId,
        title: sorted[0]?.goalTitle || "Untitled goal",
        kind: sorted[0]?.goalKind || "company",
        reports: sorted,
        openCount: sorted.filter((report) => !report.resolvedAt).length,
        helpCount: sorted.filter(
          (report) => !report.resolvedAt && isHelpRequest(report),
        ).length,
        routedCount: sorted.filter(
          (report) => report.resolution === "follow_up",
        ).length,
        returnedCount: sorted.filter(
          (report) => report.supervisorConfirmedAt && !report.resolvedAt,
        ).length,
        newestAt: reportTimestamp(sorted[0]),
      };
    })
    .sort(
      (a, b) =>
        b.returnedCount - a.returnedCount ||
        b.helpCount - a.helpCount ||
        b.openCount - a.openCount ||
        new Date(b.newestAt).getTime() - new Date(a.newestAt).getTime(),
    );
};

const AdminTeamFeedbackInbox = () => {
  const me = useSelector(selectUser);
  const selectedCompanyUsers = useSelector(selectCompanyUsers);
  const companyUsers = useMemo(
    () => selectedCompanyUsers ?? [],
    [selectedCompanyUsers],
  );
  const companyGoals = useSelector(selectAllCompanyGoals);
  const galloGoals = useSelector(selectAllGalloGoals);
  const dispatch = useAppDispatch();

  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminQueueFilter>("needs_review");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reviewGoalId, setReviewGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (!me?.companyId) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    return subscribeToCompanyGoalAccountReports(
      me.companyId,
      (nextReports) => {
        setReports(nextReports);
        setLoading(false);
      },
      (listenerError) => {
        console.error("Company feedback listener failed:", listenerError);
        setError("Company feedback could not be loaded. Please try again.");
        setLoading(false);
      },
    );
  }, [me?.companyId]);

  const nameByUid = useMemo(() => {
    const names: Record<string, string> = {};
    companyUsers.forEach((user) => {
      names[user.uid] =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
        "Unknown user";
    });
    return names;
  }, [companyUsers]);

  const supervisorByUid = useMemo(() => {
    const usersByUid = new Map(companyUsers.map((user) => [user.uid, user]));
    const supervisors: Record<string, string> = {};
    companyUsers.forEach((user) => {
      const supervisor = user.reportsTo
        ? usersByUid.get(user.reportsTo)
        : undefined;
      if (supervisor) {
        supervisors[user.uid] =
          `${supervisor.firstName ?? ""} ${supervisor.lastName ?? ""}`.trim();
      }
    });
    return supervisors;
  }, [companyUsers]);

  const counts = useMemo(
    () => ({
      needsReview: reports.filter(
        (report) => !report.resolvedAt && !report.supervisorConfirmedAt,
      ).length,
      help: reports.filter(
        (report) => !report.resolvedAt && isHelpRequest(report),
      ).length,
      routed: reports.filter((report) => report.resolution === "follow_up")
        .length,
      returned: reports.filter(
        (report) => report.supervisorConfirmedAt && !report.resolvedAt,
      ).length,
    }),
    [reports],
  );

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (!matchesFilter(report, filter)) return false;
      if (!term) return true;
      return [
        report.goalTitle,
        report.accountName,
        report.accountNumber,
        report.oppId,
        nameByUid[report.userId],
        report.userFirstName,
        report.userLastName,
        report.declinedBy,
        report.note,
        report.supervisorNote,
        ...(report.reasonKeys ?? []).map(getReasonLabel),
        ...(report.helpKeys ?? []).map(getReasonLabel),
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [filter, nameByUid, reports, search]);

  const groups = useMemo(
    () => buildGoalGroups(visibleReports),
    [visibleReports],
  );

  useEffect(() => {
    if (groups.length !== 1) return;
    const goalId = groups[0].goalId;
    setExpanded((current) =>
      Object.prototype.hasOwnProperty.call(current, goalId)
        ? current
        : { ...current, [goalId]: true },
    );
  }, [groups]);

  const reviewReports = useMemo(
    () => reports.filter((report) => report.goalId === reviewGoalId),
    [reports, reviewGoalId],
  );
  const reviewGoal = reviewReports[0];

  const removedKeys = useMemo(() => {
    if (!reviewGoal) return [];
    if (reviewGoal.goalKind === "company") {
      const goal = companyGoals.find((candidate) => candidate.id === reviewGoal.goalId);
      return (goal?.goalAssignments ?? [])
        .filter((assignment) => !isAssignmentActive(assignment))
        .map((assignment) => assignment.accountNumber.toString());
    }

    const goal = galloGoals.find(
      (candidate) => candidate.goalDetails.goalId === reviewGoal.goalId,
    );
    return (goal?.accounts ?? [])
      .filter((account) => account.status === "disabled")
      .map((account) => account.oppId);
  }, [companyGoals, galloGoals, reviewGoal]);

  const actorName =
    `${me?.firstName ?? ""} ${me?.lastName ?? ""}`.trim() || "An admin";

  const notifyByRep = async (
    affected: GoalAccountReport[],
    resolution: "accepted" | "follow_up",
    note?: string,
  ) => {
    if (!me?.uid) return;
    const accountsByRep = new Map<string, string[]>();
    affected.forEach((report) => {
      accountsByRep.set(report.userId, [
        ...(accountsByRep.get(report.userId) ?? []),
        report.accountName || report.accountNumber || report.oppId || "an account",
      ]);
    });

    await Promise.all(
      [...accountsByRep.entries()].map(([targetUserId, accountNames]) =>
        notifyReportDecision({
          actorUserId: me.uid,
          actorName,
          targetUserId,
          goalId: affected[0]?.goalId ?? "",
          goalTitle: affected[0]?.goalTitle,
          resolution,
          accountNames,
          resolutionNote: note,
        }),
      ),
    );
  };

  const handleRequestFollowUp = async (reportIds: string[], note: string) => {
    if (!me?.uid || !reportIds.length) return;
    const affected = reviewReports.filter((report) => reportIds.includes(report.id));
    const unassigned = affected.filter((report) => !supervisorByUid[report.userId]);
    if (unassigned.length) {
      dispatch(
        showMessage({
          text: "Assign a supervisor to every selected rep before routing follow-up.",
          severity: "warning",
        }),
      );
      return;
    }

    await resolveGoalAccountReports(reportIds, "follow_up", me.uid, note);
    await notifyByRep(affected, "follow_up", note);
  };

  const handleAccept = async (accountGroups: AccountGroup[]) => {
    if (!me?.uid || !reviewGoal || !accountGroups.length) return;

    if (reviewGoal.goalKind === "company") {
      const targets = accountGroups.flatMap((group) =>
        group.reports
          .filter((report) => report.accountNumber)
          .map((report) => ({
            goalId: reviewGoal.goalId,
            uid: report.userId,
            accountNumber: report.accountNumber as string,
          })),
      );
      await removeAccountsFromCompanyGoal(reviewGoal.goalId, targets, me.uid);
    } else {
      const goal = galloGoals.find(
        (candidate) => candidate.goalDetails.goalId === reviewGoal.goalId,
      );
      if (!goal) {
        dispatch(
          showMessage({
            text: "That Gallo goal is not loaded yet. Open Goals Manager and try again.",
            severity: "warning",
          }),
        );
        return;
      }
      const oppIds = accountGroups
        .map((group) => group.oppId)
        .filter((value): value is string => Boolean(value));
      await setGalloAccountStatus(goal.id, oppIds, "disabled");
    }

    const affected = accountGroups.flatMap((group) =>
      group.reports.filter((report) => !report.resolvedAt),
    );
    await resolveGoalAccountReports(
      affected.map((report) => report.id),
      "accepted",
      me.uid,
    );
    await notifyByRep(affected, "accepted");
  };

  const filterOptions: Array<[AdminQueueFilter, string]> = [
    ["needs_review", "Needs review"],
    ["help", "Help requested"],
    ["returned", "Returned"],
    ["routed", "With supervisors"],
    ["resolved", "Resolved"],
    ["all", "All"],
  ];

  return (
    <main className="team-feedback-page team-feedback-page--admin">
      <header className="team-feedback-header">
        <div className="team-feedback-header__identity">
          <span className="team-feedback-header__mark" aria-hidden="true">
            <GroupsOutlinedIcon />
          </span>
          <div>
            <span className="team-feedback-eyebrow">Management</span>
            <h1>Team feedback</h1>
            <p>Review account blockers and help requests across every active goal.</p>
          </div>
        </div>
        <span className="team-feedback-live">
          <span aria-hidden="true" /> Live updates
        </span>
      </header>

      {!loading && !error && (
        <section className="team-feedback-summary" aria-label="Inbox summary">
          <div>
            <span>Needs review</span>
            <strong>{counts.needsReview.toLocaleString()}</strong>
            <small>New decisions</small>
          </div>
          <div className={counts.help > 0 ? "has-help" : ""}>
            <span>Help requested</span>
            <strong>{counts.help.toLocaleString()}</strong>
            <small>Reps waiting</small>
          </div>
          <div className={counts.returned > 0 ? "has-returned" : ""}>
            <span>Returned</span>
            <strong>{counts.returned.toLocaleString()}</strong>
            <small>Supervisor evidence</small>
          </div>
          <div>
            <span>With supervisors</span>
            <strong>{counts.routed.toLocaleString()}</strong>
            <small>In follow-up</small>
          </div>
        </section>
      )}

      <section className="team-feedback-panel" aria-labelledby="admin-feedback-title">
        <div className="team-feedback-panel__heading">
          <div>
            <span className="team-feedback-panel__icon" aria-hidden="true">
              <WarningAmberRoundedIcon />
            </span>
            <div>
              <h2 id="admin-feedback-title">Company feedback inbox</h2>
              <p>Grouped by goal so decisions update the correct assignments.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="team-feedback-state">
            <span aria-hidden="true"><CircularProgress size={30} /></span>
            <strong>Loading company feedback</strong>
            <p>Building the live review queue.</p>
          </div>
        ) : error ? (
          <div className="team-feedback-state team-feedback-state--error">
            <span aria-hidden="true"><WarningAmberRoundedIcon /></span>
            <strong>Team feedback is unavailable</strong>
            <p>{error}</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="team-feedback-empty">
            <span className="team-feedback-empty__icon" aria-hidden="true">
              <TaskAltRoundedIcon />
            </span>
            <h3>No feedback has been submitted</h3>
            <p>Rep-reported account blockers and help requests will appear here automatically.</p>
          </div>
        ) : (
          <>
            <div className="team-feedback-toolbar">
              <TextField
                className="team-feedback-search"
                size="small"
                label="Search feedback"
                placeholder="Goal, rep, account, reason…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon aria-hidden="true" />
                    </InputAdornment>
                  ),
                }}
              />
              <div className="team-feedback-filters" aria-label="Filter feedback">
                {filterOptions.map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={filter === value ? "is-active" : ""}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="team-feedback-state">
                <span aria-hidden="true"><SearchRoundedIcon /></span>
                <strong>No matching feedback</strong>
                <p>Try another search or queue filter.</p>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearch("");
                    setFilter("needs_review");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="team-feedback-groups">
                {groups.map((group) => {
                  const isOpen = expanded[group.goalId] ?? false;
                  const panelId = `admin-feedback-${group.goalId}`;
                  return (
                    <article key={group.goalId} className="team-feedback-group">
                      <button
                        type="button"
                        className="team-feedback-group__header"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [group.goalId]: !isOpen,
                          }))
                        }
                      >
                        <span className="team-feedback-group__avatar" aria-hidden="true">
                          <StorefrontOutlinedIcon />
                        </span>
                        <span className="team-feedback-group__identity">
                          <strong>{group.title}</strong>
                          <small>
                            {group.kind === "gallo" ? "Gallo Axis" : "Company goal"}
                            {" · "}{group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                          </small>
                        </span>
                        <span className="team-feedback-group__meta">
                          {group.helpCount > 0 && (
                            <span className="team-feedback-returned-badge is-help">
                              {group.helpCount} need help
                            </span>
                          )}
                          {group.returnedCount > 0 && (
                            <span className="team-feedback-returned-badge">
                              {group.returnedCount} returned
                            </span>
                          )}
                          <span className="team-feedback-age">
                            {group.openCount} open
                          </span>
                        </span>
                        <ExpandMoreRoundedIcon
                          className={`team-feedback-chevron ${isOpen ? "is-open" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div id={panelId} className="team-feedback-group__body">
                          {group.reports.map((report) => (
                            <article
                              className={`team-feedback-card ${
                                report.supervisorConfirmedAt && !report.resolvedAt
                                  ? "is-returned"
                                  : ""
                              }`}
                              key={report.id}
                            >
                              <div className="team-feedback-card__top">
                                <span className="team-feedback-card__store" aria-hidden="true">
                                  <StorefrontOutlinedIcon />
                                </span>
                                <div className="team-feedback-card__identity">
                                  <div>
                                    <h3>{report.accountName || report.accountNumber || report.oppId}</h3>
                                    <span className={`team-feedback-card__state state-${
                                      report.supervisorConfirmedAt && !report.resolvedAt
                                        ? "returned"
                                        : report.resolution === "follow_up"
                                          ? "routed"
                                          : report.resolvedAt
                                            ? "resolved"
                                            : "open"
                                    }`}>
                                      {report.supervisorConfirmedAt && !report.resolvedAt
                                        ? "Returned"
                                        : report.resolution === "follow_up"
                                          ? "With supervisor"
                                          : report.resolvedAt
                                            ? "Resolved"
                                            : "Needs review"}
                                    </span>
                                  </div>
                                  <p>
                                    {nameByUid[report.userId] || "Unknown rep"}
                                    {report.accountNumber ? ` · #${report.accountNumber}` : ""}
                                  </p>
                                </div>
                                <span className="team-feedback-age">{reportAge(report)}</span>
                              </div>

                              {report.declinedBy && (
                                <p className="team-feedback-contact">
                                  <PersonOutlineRoundedIcon /> Rep spoke with {report.declinedBy}
                                </p>
                              )}
                              <div className="team-feedback-tags">
                                {(report.reasonKeys ?? []).map((key) => (
                                  <span key={key}>{getReasonLabel(key)}</span>
                                ))}
                                {(report.helpKeys ?? []).map((key) => (
                                  <span key={key} className="is-help">{getReasonLabel(key)}</span>
                                ))}
                              </div>
                              {report.note && (
                                <blockquote className="team-feedback-rep-note">{report.note}</blockquote>
                              )}
                              {report.supervisorNote && (
                                <div className="team-feedback-history">
                                  <strong>Supervisor follow-up</strong>
                                  <span>{report.supervisorNote}</span>
                                </div>
                              )}
                              <div className="team-feedback-card__actions">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setReviewGoalId(group.goalId)}
                                >
                                  Review goal feedback
                                </Button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <GoalReportsReviewModal
        open={Boolean(reviewGoalId)}
        onClose={() => setReviewGoalId(null)}
        goalTitle={reviewGoal?.goalTitle}
        reports={reviewReports}
        removedKeys={removedKeys}
        supervisorByUid={supervisorByUid}
        nameByUid={nameByUid}
        onAccept={handleAccept}
        onRequestFollowUp={handleRequestFollowUp}
      />
    </main>
  );
};

export default AdminTeamFeedbackInbox;
