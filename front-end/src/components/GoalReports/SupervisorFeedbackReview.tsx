// src/components/GoalReports/SupervisorFeedbackReview.tsx
//
// The supervisor's queue: accounts an admin routed to them after a rep
// reported an issue.
//
// GROUPED BY REP, not by account. A supervisor's unit of work is a phone call
// with one of their people — they'll talk through all six of Manuel's stores
// at once, not ping-pong between reps. So the list is organised the way the
// conversation happens, and actions apply to a whole rep's batch.
//
// SAFETY PROPERTY: nothing here can remove an account from a goal. Only admins
// can do that. No misread button can do damage, and the UI says so plainly.

import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { selectUser, selectCompanyUsers } from "../../Slices/userSlice";
import { useAppDispatch } from "../../utils/store";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  GoalAccountReport,
  getReasonLabel,
  isHelpRequest,
} from "../../types/goalReports";
import {
  confirmReportAsSupervisor,
  fetchFollowUpsForSupervisor,
  keepWorkingReport,
  notifyReportDecision,
} from "../../utils/goalReports/goalAccountReportHelpers";
import "./goalReportsReview.css";

type PendingAction = {
  reports: GoalAccountReport[];
  kind: "confirm" | "keep_working";
  /** Shown in the dialog so bulk actions state their scope. */
  scopeLabel: string;
};

type RepGroup = {
  uid: string;
  name: string;
  reports: GoalAccountReport[];
  revisitCount: number;
  oldestWaitingDays: number;
};

/** Days since the admin routed this — the thing that makes a queue feel urgent. */
const waitingDays = (r: GoalAccountReport): number => {
  if (!r.resolvedAt) return 0;
  const then = new Date(r.resolvedAt).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
};

const waitingLabel = (days: number) =>
  days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;

const SupervisorFeedbackReview: React.FC = () => {
  const me = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const dispatch = useAppDispatch();

  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const nameByUid = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      if (name) map[u.uid] = name;
    });
    return map;
  }, [companyUsers]);

  const myRepUids = useMemo(
    () =>
      companyUsers
        .filter(
          (u) => u.reportsTo === me?.uid && (u.status ?? "active") === "active",
        )
        .map((u) => u.uid),
    [companyUsers, me?.uid],
  );

  const load = useMemo(
    () => async () => {
      if (!me?.companyId || !myRepUids.length) {
        setReports([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        setReports(await fetchFollowUpsForSupervisor(me.companyId, myRepUids));
      } catch (err) {
        console.error("Failed to load supervisor follow-ups:", err);
      } finally {
        setLoading(false);
      }
    },
    [me?.companyId, myRepUids],
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Grouped by rep, revisits first — those are by definition overdue. */
  const groups = useMemo<RepGroup[]>(() => {
    const map = new Map<string, GoalAccountReport[]>();

    reports.forEach((r) => {
      map.set(r.userId, [...(map.get(r.userId) ?? []), r]);
    });

    return [...map.entries()]
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
        revisitCount: list.filter((r) => r.supervisorConfirmedAt).length,
        oldestWaitingDays: Math.max(...list.map(waitingDays), 0),
      }))
      .sort(
        (a, b) =>
          b.revisitCount - a.revisitCount ||
          b.oldestWaitingDays - a.oldestWaitingDays ||
          a.name.localeCompare(b.name),
      );
  }, [reports, nameByUid]);

  const totalCount = reports.length;

  const openAction = (
    list: GoalAccountReport[],
    kind: PendingAction["kind"],
    scopeLabel: string,
  ) => {
    setNote("");
    setPending({ reports: list, kind, scopeLabel });
  };

  const submit = async () => {
    if (!pending || !me?.uid) return;

    const { reports: list, kind } = pending;
    setBusy(true);

    try {
      if (kind === "confirm") {
        await Promise.all(
          list.map((r) => confirmReportAsSupervisor(r.id, me.uid, note)),
        );
        dispatch(
          showMessage(
            list.length === 1
              ? "Sent to the admin for a decision."
              : `${list.length} accounts sent to the admin.`,
          ),
        );
      } else {
        await Promise.all(
          list.map((r) => keepWorkingReport(r.id, me.uid, note)),
        );

        // One notification per rep listing their accounts — the rep filed
        // these, so a no with a reason still counts as an answer.
        const byRep = new Map<string, string[]>();
        list.forEach((r) => {
          byRep.set(r.userId, [
            ...(byRep.get(r.userId) ?? []),
            r.accountName || "an account",
          ]);
        });

        await Promise.all(
          [...byRep.entries()].map(([targetUserId, accountNames]) =>
            notifyReportDecision({
              actorUserId: me.uid,
              actorName:
                `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() ||
                "Your supervisor",
              targetUserId,
              goalId: list[0].goalId,
              goalTitle: list[0].goalTitle,
              resolution: "follow_up",
              accountNames,
              resolutionNote:
                note.trim() || "Reviewed — worth another try at this account.",
            }),
          ),
        );

        dispatch(
          showMessage(
            list.length === 1
              ? "Closed. The rep has been notified."
              : `${list.length} accounts closed. The rep has been notified.`,
          ),
        );
      }

      setPending(null);
      await load();
    } catch (err) {
      console.error("Supervisor action failed:", err);
      dispatch(showMessage({ text: "Could not save that.", severity: "error" }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sfr-wrap">
      <header className="sfr-header">
        <h2 className="sfr-title">Feedback to follow up</h2>
        <p className="sfr-subtitle">
          Accounts your reps flagged that an admin asked you to look into.
          <strong> Only an admin can remove an account from a goal</strong> —
          nothing here changes the goal.
        </p>
      </header>

      {loading ? (
        <p className="sfr-empty">Loading&hellip;</p>
      ) : !totalCount ? (
        <p className="sfr-empty">Nothing waiting on you right now.</p>
      ) : (
        <>
          <p className="sfr-count">
            {totalCount} account{totalCount === 1 ? "" : "s"} across{" "}
            {groups.length} rep{groups.length === 1 ? "" : "s"}
          </p>

          <div className="sfr-groups">
            {groups.map((g) => {
              const isOpen = expanded[g.uid] ?? false;

              return (
                <div key={g.uid} className="sfr-group">
                  <button
                    type="button"
                    className="sfr-group-head"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [g.uid]: !isOpen }))
                    }
                  >
                    <ExpandMoreIcon
                      className={`sfr-chevron ${isOpen ? "open" : ""}`}
                      fontSize="small"
                    />

                    <span className="sfr-group-name">{g.name}</span>

                    <span className="sfr-group-meta">
                      {g.reports.length} account
                      {g.reports.length === 1 ? "" : "s"}
                      {g.revisitCount > 0 && (
                        <span className="sfr-revisit-tag">
                          {g.revisitCount} back to you
                        </span>
                      )}
                      <span className="sfr-waiting">
                        {waitingLabel(g.oldestWaitingDays)}
                      </span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="sfr-group-body">
                      {g.reports.map((r) => (
                        <div
                          key={r.id}
                          className={`sfr-card ${
                            r.supervisorConfirmedAt ? "revisit" : ""
                          }`}
                        >
                          <div className="sfr-card-head">
                            <span className="sfr-account">
                              {r.accountName || r.accountNumber || r.oppId}
                              {r.supervisorConfirmedAt && (
                                <span className="sfr-revisit-tag">
                                  Back to you
                                </span>
                              )}
                            </span>
                            <span className="sfr-goal">
                              {r.goalTitle}
                              <span className="sfr-waiting">
                                {waitingLabel(waitingDays(r))}
                              </span>
                            </span>
                          </div>

                          {r.declinedBy && (
                            <div className="sfr-rep">
                              <span className="goal-reports-contact">
                                <PersonIcon fontSize="inherit" />
                                spoke with {r.declinedBy}
                              </span>
                            </div>
                          )}

                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={0.5}
                            sx={{ my: 1 }}
                          >
                            {(r.reasonKeys ?? []).map((k) => (
                              <Chip
                                key={k}
                                size="small"
                                variant="outlined"
                                label={getReasonLabel(k)}
                              />
                            ))}
                            {isHelpRequest(r) &&
                              (r.helpKeys ?? []).map((k) => (
                                <Chip
                                  key={k}
                                  size="small"
                                  color="secondary"
                                  label={getReasonLabel(k)}
                                />
                              ))}
                          </Stack>

                          {r.note && (
                            <p className="goal-reports-note">{r.note}</p>
                          )}

                          {r.supervisorConfirmedAt && (
                            <div className="sfr-prior">
                              <span className="sfr-prior-label">
                                You already looked at this on{" "}
                                {new Date(
                                  r.supervisorConfirmedAt,
                                ).toLocaleDateString()}
                              </span>
                              {r.supervisorNote && (
                                <span className="sfr-prior-note">
                                  &ldquo;{r.supervisorNote}&rdquo;
                                </span>
                              )}
                            </div>
                          )}

                          {r.resolutionNote && (
                            <p className="sfr-admin-note">
                              <strong>
                                {(() => {
                                  const who =
                                    nameByUid[r.resolvedBy ?? ""] ||
                                    "The admin";
                                  return r.supervisorConfirmedAt
                                    ? `${who} came back with:`
                                    : `${who} asked:`;
                                })()}
                              </strong>{" "}
                              {r.resolutionNote}
                            </p>
                          )}

                          <div className="sfr-actions">
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              onClick={() =>
                                openAction(
                                  [r],
                                  "confirm",
                                  r.accountName || "this account",
                                )
                              }
                            >
                              Confirm issue
                            </Button>

                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() =>
                                openAction(
                                  [r],
                                  "keep_working",
                                  r.accountName || "this account",
                                )
                              }
                            >
                              Keep working it
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* One call handles the whole rep — so does one action. */}
                      <div className="sfr-bulk">
                        <span className="sfr-bulk-label">
                          After talking with {g.name.split(" ")[0]}:
                        </span>
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          onClick={() =>
                            openAction(
                              g.reports,
                              "confirm",
                              `all ${g.reports.length} of ${g.name}'s accounts`,
                            )
                          }
                        >
                          Confirm all
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            openAction(
                              g.reports,
                              "keep_working",
                              `all ${g.reports.length} of ${g.name}'s accounts`,
                            )
                          }
                        >
                          Keep working all
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Dialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {pending?.kind === "confirm"
            ? "Confirm these can't execute"
            : "Keep working these"}
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {pending?.kind === "confirm" ? (
              <>
                Sending <strong>{pending?.scopeLabel}</strong> back to the admin
                with your note. The accounts stay on the goal until they decide.
              </>
            ) : (
              <>
                Closing <strong>{pending?.scopeLabel}</strong> and telling the
                rep to keep pursuing. Nothing changes on the goal.
              </>
            )}
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            autoFocus
            label="What did you find?"
            placeholder={
              pending?.kind === "confirm"
                ? "e.g. Visited — remodeling until March, no floor space"
                : "e.g. Buyer is open to it, worth another ask next week"
            }
            InputLabelProps={{ shrink: true }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPending(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={pending?.kind === "confirm" ? "warning" : "primary"}
            onClick={submit}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : pending?.kind === "confirm"
                ? "Send to admin"
                : "Close and notify rep"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SupervisorFeedbackReview;
