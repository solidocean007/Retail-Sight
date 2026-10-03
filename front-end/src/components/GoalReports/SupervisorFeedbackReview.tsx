import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { showMessage } from "../../Slices/snackbarSlice";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import {
  GoalAccountReport,
  getReasonLabel,
  isHelpRequest,
} from "../../types/goalReports";
import {
  confirmReportAsSupervisor,
  keepWorkingReport,
  notifyReportDecision,
  subscribeToSupervisorFollowUps,
} from "../../utils/goalReports/goalAccountReportHelpers";
import { useAppDispatch } from "../../utils/store";
import AdminTeamFeedbackInbox from "./AdminTeamFeedbackInbox";

import "./supervisorFeedbackReview.css";

type PendingAction = {
  reports: GoalAccountReport[];
  kind: "confirm" | "keep_working";
  scopeLabel: string;
};

type QueueFilter = "all" | "help" | "aging";

type RepGroup = {
  uid: string;
  name: string;
  reports: GoalAccountReport[];
  helpCount: number;
  oldestWaitingDays: number;
};

const waitingDays = (report: GoalAccountReport): number => {
  if (!report.resolvedAt) return 0;
  const routedAt = new Date(report.resolvedAt).getTime();
  if (Number.isNaN(routedAt)) return 0;
  return Math.max(0, Math.floor((Date.now() - routedAt) / 86_400_000));
};

const waitingLabel = (days: number) => {
  if (days === 0) return "Routed today";
  return `Waiting ${days} day${days === 1 ? "" : "s"}`;
};

const waitingTone = (days: number) =>
  days >= 7 ? "is-overdue" : days >= 3 ? "is-aging" : "";

const buildGroups = (
  reports: GoalAccountReport[],
  nameByUid: Record<string, string>,
): RepGroup[] => {
  const grouped = new Map<string, GoalAccountReport[]>();

  reports.forEach((report) => {
    grouped.set(report.userId, [...(grouped.get(report.userId) ?? []), report]);
  });

  return [...grouped.entries()]
    .map(([uid, list]) => ({
      uid,
      name:
        nameByUid[uid] ||
        `${list[0].userFirstName ?? ""} ${list[0].userLastName ?? ""}`.trim() ||
        "Unknown rep",
      reports: [...list].sort(
        (a, b) =>
          Number(Boolean(b.supervisorConfirmedAt)) -
            Number(Boolean(a.supervisorConfirmedAt)) ||
          waitingDays(b) - waitingDays(a),
      ),
      helpCount: list.filter(isHelpRequest).length,
      oldestWaitingDays: Math.max(...list.map(waitingDays), 0),
    }))
    .sort(
      (a, b) =>
        b.helpCount - a.helpCount ||
        b.oldestWaitingDays - a.oldestWaitingDays ||
        a.name.localeCompare(b.name),
    );
};

const SupervisorFollowUpReview = () => {
  const me = useSelector(selectUser);
  const selectedCompanyUsers = useSelector(selectCompanyUsers);
  const companyUsers = useMemo(
    () => selectedCompanyUsers ?? [],
    [selectedCompanyUsers],
  );
  const dispatch = useAppDispatch();

  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const nameByUid = useMemo(() => {
    const names: Record<string, string> = {};
    companyUsers.forEach((user) => {
      const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
      if (name) names[user.uid] = name;
    });
    return names;
  }, [companyUsers]);

  const myRepUids = useMemo(
    () =>
      companyUsers
        .filter(
          (user) =>
            user.reportsTo === me?.uid &&
            (user.status ?? "active") === "active",
        )
        .map((user) => user.uid),
    [companyUsers, me?.uid],
  );

  useEffect(() => {
    if (!me?.companyId || !myRepUids.length) {
      setReports([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    return subscribeToSupervisorFollowUps(
      me.companyId,
      myRepUids,
      (nextReports) => {
        setReports(nextReports);
        setLoading(false);
      },
      (loadError) => {
        console.error("Failed to load supervisor follow-ups:", loadError);
        setError("Team feedback could not be loaded. Please try again.");
        setLoading(false);
      },
    );
  }, [me?.companyId, myRepUids, refreshVersion]);

  const allGroups = useMemo(
    () => buildGroups(reports, nameByUid),
    [nameByUid, reports],
  );

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      if (filter === "help" && !isHelpRequest(report)) return false;
      if (filter === "aging" && waitingDays(report) < 3) return false;
      if (!term) return true;

      const searchable = [
        nameByUid[report.userId],
        report.userFirstName,
        report.userLastName,
        report.accountName,
        report.accountNumber,
        report.oppId,
        report.goalTitle,
        report.declinedBy,
        report.note,
        report.resolutionNote,
        ...(report.reasonKeys ?? []).map(getReasonLabel),
        ...(report.helpKeys ?? []).map(getReasonLabel),
      ];

      return searchable.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [filter, nameByUid, reports, search]);

  const groups = useMemo(
    () => buildGroups(visibleReports, nameByUid),
    [nameByUid, visibleReports],
  );

  useEffect(() => {
    if (groups.length !== 1) return;
    const uid = groups[0].uid;
    setExpanded((current) =>
      Object.prototype.hasOwnProperty.call(current, uid)
        ? current
        : { ...current, [uid]: true },
    );
  }, [groups]);

  const helpCount = reports.filter(isHelpRequest).length;

  const openAction = (
    actionReports: GoalAccountReport[],
    kind: PendingAction["kind"],
    scopeLabel: string,
  ) => {
    setNote("");
    setPending({ reports: actionReports, kind, scopeLabel });
  };

  const submit = async () => {
    if (!pending || !me?.uid || busy) return;

    const { reports: actionReports, kind } = pending;
    setBusy(true);

    try {
      if (kind === "confirm") {
        await Promise.all(
          actionReports.map((report) =>
            confirmReportAsSupervisor(report.id, me.uid, note),
          ),
        );
        dispatch(
          showMessage(
            actionReports.length === 1
              ? "Sent to the admin for a decision."
              : `${actionReports.length} accounts sent to the admin.`,
          ),
        );
      } else {
        await Promise.all(
          actionReports.map((report) =>
            keepWorkingReport(report.id, me.uid, note),
          ),
        );

        const accountsByRep = new Map<string, string[]>();
        actionReports.forEach((report) => {
          accountsByRep.set(report.userId, [
            ...(accountsByRep.get(report.userId) ?? []),
            report.accountName || "an account",
          ]);
        });

        await Promise.all(
          [...accountsByRep.entries()].map(([targetUserId, accountNames]) =>
            notifyReportDecision({
              actorUserId: me.uid,
              actorName:
                `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() ||
                "Your supervisor",
              targetUserId,
              goalId: actionReports[0].goalId,
              goalTitle: actionReports[0].goalTitle,
              resolution: "follow_up",
              accountNames,
              resolutionNote:
                note.trim() || "Reviewed — worth another try at this account.",
            }),
          ),
        );

        dispatch(
          showMessage(
            actionReports.length === 1
              ? "Closed. The rep has been notified."
              : `${actionReports.length} accounts closed. The rep has been notified.`,
          ),
        );
      }

      setPending(null);
    } catch (actionError) {
      console.error("Supervisor action failed:", actionError);
      dispatch(
        showMessage({ text: "Could not save that.", severity: "error" }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="team-feedback-page">
      <header className="team-feedback-header">
        <div className="team-feedback-header__identity">
          <span className="team-feedback-header__mark" aria-hidden="true">
            <GroupsOutlinedIcon />
          </span>
          <div>
            <span className="team-feedback-eyebrow">Management</span>
            <h1>Team feedback</h1>
            <p>Review account follow-ups routed to your direct reports.</p>
          </div>
        </div>
        <Button
          className="team-feedback-refresh"
          variant="outlined"
          size="small"
          startIcon={
            loading ? <CircularProgress size={15} /> : <RefreshRoundedIcon />
          }
          disabled={loading || !myRepUids.length}
          onClick={() => setRefreshVersion((current) => current + 1)}
        >
          Refresh
        </Button>
      </header>

      {!loading && reports.length > 0 && (
        <section className="team-feedback-summary" aria-label="Queue summary">
          <div>
            <span>Needs review</span>
            <strong>{reports.length.toLocaleString()}</strong>
            <small>Account follow-ups</small>
          </div>
          <div>
            <span>Teammates</span>
            <strong>{allGroups.length.toLocaleString()}</strong>
            <small>Reps in the queue</small>
          </div>
          <div className={helpCount > 0 ? "has-help" : ""}>
            <span>Needs help</span>
            <strong>{helpCount.toLocaleString()}</strong>
            <small>Active requests</small>
          </div>
        </section>
      )}

      <section
        className="team-feedback-panel"
        aria-labelledby="feedback-queue-title"
      >
        <div className="team-feedback-panel__heading">
          <div>
            <span className="team-feedback-panel__icon" aria-hidden="true">
              <WarningAmberRoundedIcon />
            </span>
            <div>
              <h2 id="feedback-queue-title">Follow-up queue</h2>
              <p>
                Nothing here removes an account from a goal. Final removal is
                always an admin decision.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <FeedbackState
            icon={<CircularProgress size={30} />}
            title="Loading team feedback"
            message="Checking for account follow-ups routed to you."
          />
        ) : error ? (
          <FeedbackState
            tone="error"
            icon={<WarningAmberRoundedIcon />}
            title="Team feedback is unavailable"
            message={error}
            action={
              <Button
                variant="outlined"
                onClick={() => setRefreshVersion((current) => current + 1)}
              >
                Try again
              </Button>
            }
          />
        ) : reports.length === 0 ? (
          <EmptyFeedbackState hasDirectReports={myRepUids.length > 0} />
        ) : (
          <>
            <div className="team-feedback-toolbar">
              <TextField
                className="team-feedback-search"
                size="small"
                label="Search feedback"
                placeholder="Rep, account, goal, reason…"
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
              <div
                className="team-feedback-filters"
                aria-label="Filter feedback"
              >
                {(
                  [
                    ["all", "All"],
                    ["help", "Help requested"],
                    ["aging", "Waiting 3+ days"],
                  ] as [QueueFilter, string][]
                ).map(([value, label]) => (
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
              <FeedbackState
                icon={<SearchRoundedIcon />}
                title="No matching feedback"
                message="Try another search or change the queue filter."
              />
            ) : (
              <div className="team-feedback-groups">
                {groups.map((group) => {
                  const isOpen = expanded[group.uid] ?? false;
                  const groupPanelId = `feedback-group-${group.uid}`;

                  return (
                    <article key={group.uid} className="team-feedback-group">
                      <button
                        type="button"
                        className="team-feedback-group__header"
                        aria-expanded={isOpen}
                        aria-controls={groupPanelId}
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [group.uid]: !isOpen,
                          }))
                        }
                      >
                        <span
                          className="team-feedback-group__avatar"
                          aria-hidden="true"
                        >
                          <PersonOutlineRoundedIcon />
                        </span>
                        <span className="team-feedback-group__identity">
                          <strong>{group.name}</strong>
                          <small>
                            {group.reports.length} account
                            {group.reports.length === 1 ? "" : "s"} waiting
                          </small>
                        </span>
                        <span className="team-feedback-group__meta">
                          {group.helpCount > 0 && (
                            <span className="team-feedback-returned-badge is-help">
                              {group.helpCount} need help
                            </span>
                          )}
                          <span
                            className={`team-feedback-age ${waitingTone(group.oldestWaitingDays)}`}
                          >
                            {waitingLabel(group.oldestWaitingDays)}
                          </span>
                        </span>
                        <ExpandMoreRoundedIcon
                          className={`team-feedback-chevron ${isOpen ? "is-open" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div
                          id={groupPanelId}
                          className="team-feedback-group__body"
                        >
                          {group.reports.map((report) => (
                            <FeedbackCard
                              key={report.id}
                              report={report}
                              adminName={nameByUid[report.resolvedBy ?? ""]}
                              onConfirm={() =>
                                openAction(
                                  [report],
                                  "confirm",
                                  report.accountName || "this account",
                                )
                              }
                              onKeepWorking={() =>
                                openAction(
                                  [report],
                                  "keep_working",
                                  report.accountName || "this account",
                                )
                              }
                            />
                          ))}

                          {group.reports.length > 1 && (
                            <div className="team-feedback-bulk">
                              <div>
                                <strong>
                                  Resolve this conversation together
                                </strong>
                                <span>
                                  Apply one decision after speaking with{" "}
                                  {group.name.split(" ")[0]}.
                                </span>
                              </div>
                              <div>
                                <Button
                                  variant="outlined"
                                  color="warning"
                                  size="small"
                                  onClick={() =>
                                    openAction(
                                      group.reports,
                                      "confirm",
                                      `all ${group.reports.length} of ${group.name}'s accounts`,
                                    )
                                  }
                                >
                                  Escalate all
                                </Button>
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() =>
                                    openAction(
                                      group.reports,
                                      "keep_working",
                                      `all ${group.reports.length} of ${group.name}'s accounts`,
                                    )
                                  }
                                >
                                  Keep pursuing all
                                </Button>
                              </div>
                            </div>
                          )}
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

      <Dialog
        className="team-feedback-dialog"
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {pending?.kind === "confirm"
            ? "Escalate to an admin"
            : "Keep pursuing"}
        </DialogTitle>
        <DialogContent>
          <p className="team-feedback-dialog__explanation">
            {pending?.kind === "confirm" ? (
              <>
                Send <strong>{pending?.scopeLabel}</strong> back to an admin
                with what you found. The account remains on the goal until the
                admin decides.
              </>
            ) : (
              <>
                Close <strong>{pending?.scopeLabel}</strong> and let the rep
                know the account should stay in play. The goal itself does not
                change.
              </>
            )}
          </p>
          <TextField
            fullWidth
            multiline
            minRows={3}
            autoFocus
            label="What did you find?"
            placeholder={
              pending?.kind === "confirm"
                ? "Visited the account; remodeling leaves no floor space until March."
                : "The buyer is open to it. Try again during next week's reset."
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={pending?.kind === "confirm" ? "warning" : "primary"}
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy
              ? "Saving…"
              : pending?.kind === "confirm"
                ? "Send to admin"
                : "Close and notify rep"}
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
};

type FeedbackCardProps = {
  report: GoalAccountReport;
  adminName?: string;
  onConfirm: () => void;
  onKeepWorking: () => void;
};

const FeedbackCard = ({
  report,
  adminName,
  onConfirm,
  onKeepWorking,
}: FeedbackCardProps) => {
  const age = waitingDays(report);
  const returned = Boolean(report.supervisorConfirmedAt);

  return (
    <article className={`team-feedback-card ${returned ? "is-returned" : ""}`}>
      <div className="team-feedback-card__top">
        <span className="team-feedback-card__store" aria-hidden="true">
          <StorefrontOutlinedIcon />
        </span>
        <div className="team-feedback-card__identity">
          <div>
            <h3>
              {report.accountName || report.accountNumber || report.oppId}
            </h3>
            {returned && (
              <span className="team-feedback-returned-badge">
                <ReplayRoundedIcon /> Returned
              </span>
            )}
          </div>
          <p>{report.goalTitle || "Goal follow-up"}</p>
        </div>
        <span className={`team-feedback-age ${waitingTone(age)}`}>
          {waitingLabel(age)}
        </span>
      </div>

      {report.declinedBy && (
        <p className="team-feedback-contact">
          <PersonOutlineRoundedIcon /> Rep spoke with {report.declinedBy}
        </p>
      )}

      {(report.reasonKeys?.length > 0 || isHelpRequest(report)) && (
        <div className="team-feedback-tags">
          {(report.reasonKeys ?? []).map((key) => (
            <span key={key}>{getReasonLabel(key)}</span>
          ))}
          {(report.helpKeys ?? []).map((key) => (
            <span key={key} className="is-help">
              {getReasonLabel(key)}
            </span>
          ))}
        </div>
      )}

      {report.note && (
        <blockquote className="team-feedback-rep-note">
          {report.note}
        </blockquote>
      )}

      {returned && (
        <div className="team-feedback-history">
          <strong>
            You reviewed this on{" "}
            {new Date(report.supervisorConfirmedAt!).toLocaleDateString()}
          </strong>
          {report.supervisorNote && <span>“{report.supervisorNote}”</span>}
        </div>
      )}

      {report.resolutionNote && (
        <div className="team-feedback-admin-note">
          <strong>{adminName || "The admin"} asked:</strong>
          <span>{report.resolutionNote}</span>
        </div>
      )}

      <div className="team-feedback-card__actions">
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={onConfirm}
        >
          Escalate to admin
        </Button>
        <Button variant="contained" size="small" onClick={onKeepWorking}>
          Keep pursuing
        </Button>
      </div>
    </article>
  );
};

type FeedbackStateProps = {
  icon: React.ReactNode;
  title: string;
  message: string;
  tone?: "default" | "error";
  action?: React.ReactNode;
};

const FeedbackState = ({
  icon,
  title,
  message,
  tone = "default",
  action,
}: FeedbackStateProps) => (
  <div className={`team-feedback-state team-feedback-state--${tone}`}>
    <span aria-hidden="true">{icon}</span>
    <strong>{title}</strong>
    <p>{message}</p>
    {action}
  </div>
);

const EmptyFeedbackState = ({
  hasDirectReports,
}: {
  hasDirectReports: boolean;
}) => (
  <div className="team-feedback-empty">
    <span className="team-feedback-empty__icon" aria-hidden="true">
      {hasDirectReports ? <TaskAltRoundedIcon /> : <GroupsOutlinedIcon />}
    </span>
    <h3>
      {hasDirectReports ? "You’re caught up" : "No direct reports assigned"}
    </h3>
    <p>
      {hasDirectReports
        ? "There’s no account feedback waiting for your review. New items appear here only after an admin routes them to you."
        : "Team Feedback follows the reporting structure. Assign active employees to you before their routed account feedback can appear here."}
    </p>

    {hasDirectReports && (
      <div
        className="team-feedback-empty__flow"
        aria-label="How Team Feedback works"
      >
        <div>
          <span>1</span>
          <strong>Rep flags an account</strong>
          <small>They record a blocker or ask for help.</small>
        </div>
        <div>
          <span>2</span>
          <strong>Admin routes it</strong>
          <small>The account stays assigned while you investigate.</small>
        </div>
        <div>
          <span>3</span>
          <strong>You close the loop</strong>
          <small>Keep pursuing or return evidence to an admin.</small>
        </div>
      </div>
    )}
  </div>
);

const SupervisorFeedbackReview = () => {
  const user = useSelector(selectUser);
  const isAdmin = ["admin", "super-admin", "developer"].includes(
    user?.role ?? "",
  );

  return isAdmin ? <AdminTeamFeedbackInbox /> : <SupervisorFollowUpReview />;
};

export default SupervisorFeedbackReview;
