// src/components/GoalReports/GoalReportsReviewModal.tsx
//
// Goal-level review — the admin's actual working surface.
//
// Design constraint from the doc: an admin who assigned a goal across 150
// accounts and gets back a wave of "can't do this" will never click through
// them one at a time. So this leads with aggregates, groups by account, and
// makes BULK acknowledge the primary action. Per-account precision is
// available via the row checkboxes, not required.
//
// Help requests sort to the top: they're the only records here with an implied
// SLA. A rep who asks for help and hears nothing stops asking, and unlike a
// reason report that silence is a broken promise rather than missing data.

import React, { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";

import {
  GoalAccountReport,
  getReasonLabel,
  isHelpRequest,
} from "../../types/goalReports";
import "./goalReportsReview.css";

interface AccountGroup {
  key: string;
  accountName: string;
  accountNumber?: string;
  oppId?: string;
  reports: GoalAccountReport[];
  hasOpenHelp: boolean;
  hasOpen: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;

  goalTitle?: string;
  reports: GoalAccountReport[];

  /** Account keys (accountNumber or oppId) currently removed from the goal. */
  removedKeys?: string[];

  /**
   * uid → supervisor display name. An admin choosing follow-up is directing a
   * specific person, so they need to see who that is before committing.
   */
  supervisorByUid?: Record<string, string>;

  /** Reason stands — account comes off the goal. */
  onAccept: (groups: AccountGroup[]) => Promise<void>;
  /** Not accepted — account stays, routed to the supervisor. */
  onRequestFollowUp: (reportIds: string[], note: string) => Promise<void>;
}

const GoalReportsReviewModal: React.FC<Props> = ({
  open,
  onClose,
  goalTitle,
  reports,
  removedKeys = [],
  supervisorByUid = {},
  onAccept,
  onRequestFollowUp,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [showHandled, setShowHandled] = useState(false);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");

  const groups = useMemo<AccountGroup[]>(() => {
    const map = new Map<string, AccountGroup>();

    reports.forEach((r) => {
      const key = r.accountNumber ?? r.oppId ?? r.id;
      const existing = map.get(key);

      if (existing) {
        existing.reports.push(r);
        existing.hasOpenHelp ||= isHelpRequest(r) && !r.resolvedAt;
        existing.hasOpen ||= !r.resolvedAt;
        return;
      }

      map.set(key, {
        key,
        accountName: r.accountName || key,
        accountNumber: r.accountNumber,
        oppId: r.oppId,
        reports: [r],
        hasOpenHelp: isHelpRequest(r) && !r.resolvedAt,
        hasOpen: !r.resolvedAt,
      });
    });

    return [...map.values()].sort((a, b) => {
      // Open help first, then anything else open, then handled.
      if (a.hasOpenHelp !== b.hasOpenHelp) return a.hasOpenHelp ? -1 : 1;
      if (a.hasOpen !== b.hasOpen) return a.hasOpen ? -1 : 1;
      return a.accountName.localeCompare(b.accountName);
    });
  }, [reports]);

  const visibleGroups = showHandled
    ? groups
    : groups.filter((g) => g.hasOpen);

  const counts = useMemo(() => {
    const reason: Record<string, number> = {};
    const help: Record<string, number> = {};
    let open = 0;

    reports.forEach((r) => {
      if (!r.resolvedAt) open += 1;
      r.reasonKeys?.forEach((k) => (reason[k] = (reason[k] ?? 0) + 1));
      r.helpKeys?.forEach((k) => (help[k] = (help[k] ?? 0) + 1));
    });

    return { reason, help, open };
  }, [reports]);

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const selectedGroups = visibleGroups.filter((g) => selected.includes(g.key));

  const selectedOpenReportIds = selectedGroups.flatMap((g) =>
    g.reports.filter((r) => !r.resolvedAt).map((r) => r.id),
  );

  const runAccept = async () => {
    if (!selectedGroups.length) return;
    setBusy(true);
    try {
      await onAccept(selectedGroups);
      setSelected([]);
    } finally {
      setBusy(false);
    }
  };

  const runFollowUp = async () => {
    if (!selectedOpenReportIds.length) return;
    setBusy(true);
    try {
      await onRequestFollowUp(selectedOpenReportIds, followUpNote);
      setSelected([]);
      setFollowUpNote("");
      setFollowUpMode(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onClick={(e) => e.stopPropagation()}
      PaperProps={{ className: "goal-reports-paper" }}
    >
      <div className="goal-reports-header">
        <span className="goal-reports-eyebrow">Account feedback</span>
        <h2 className="goal-reports-title">{goalTitle || "Goal"}</h2>
      </div>

      <DialogContent className="goal-reports-content">
        {reports.length === 0 ? (
          <Typography color="text.secondary">
            No reps have reported anything on this goal yet.
          </Typography>
        ) : (
          <>
            {/* Aggregates — what an admin reads first */}
            <div className="goal-reports-summary">
              <div className="goal-reports-stat">
                <span className="goal-reports-stat-value">
                  {reports.length}
                </span>
                <span className="goal-reports-stat-label">reports</span>
              </div>
              <div className="goal-reports-stat">
                <span className="goal-reports-stat-value open">
                  {counts.open}
                </span>
                <span className="goal-reports-stat-label">open</span>
              </div>
              <div className="goal-reports-stat">
                <span className="goal-reports-stat-value">
                  {groups.length}
                </span>
                <span className="goal-reports-stat-label">accounts</span>
              </div>
            </div>

            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1 }}>
              {Object.entries(counts.reason).map(([k, n]) => (
                <Chip
                  key={k}
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={`${getReasonLabel(k)} · ${n}`}
                />
              ))}
              {Object.entries(counts.help).map(([k, n]) => (
                <Chip
                  key={k}
                  size="small"
                  color="secondary"
                  label={`${getReasonLabel(k)} · ${n}`}
                />
              ))}
            </Stack>

            <div className="goal-reports-toolbar">
              <Button
                size="small"
                onClick={() => setShowHandled((s) => !s)}
              >
                {showHandled ? "Hide handled" : "Show handled"}
              </Button>

              <Button
                size="small"
                onClick={() =>
                  setSelected(
                    selected.length === visibleGroups.length
                      ? []
                      : visibleGroups.map((g) => g.key),
                  )
                }
              >
                {selected.length === visibleGroups.length
                  ? "Clear selection"
                  : "Select all"}
              </Button>
            </div>

            <div className="goal-reports-list">
              {visibleGroups.map((g) => {
                const removed = removedKeys.includes(g.key);

                return (
                  <div
                    key={g.key}
                    className={`goal-reports-group ${removed ? "removed" : ""}`}
                  >
                    <div className="goal-reports-group-head">
                      <Checkbox
                        size="small"
                        checked={selected.includes(g.key)}
                        onChange={() => toggle(g.key)}
                        disabled={removed || !g.hasOpen}
                      />
                      <div className="goal-reports-group-name">
                        {g.accountName}
                        {removed && (
                          <span className="goal-reports-removed-tag small">
                            Removed
                          </span>
                        )}
                        {g.hasOpenHelp && (
                          <span className="goal-reports-help-tag">
                            Needs help
                          </span>
                        )}
                      </div>
                    </div>

                    {g.reports.map((r) => (
                      <div key={r.id} className="goal-reports-group-report">
                        <span className="goal-reports-rep">
                          {[r.userFirstName, r.userLastName]
                            .filter(Boolean)
                            .join(" ") || "Unknown rep"}
                          {supervisorByUid[r.userId] && (
                            <span className="goal-reports-supervisor">
                              reports to {supervisorByUid[r.userId]}
                            </span>
                          )}
                        </span>

                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.5}
                          sx={{ my: 0.5 }}
                        >
                          {(r.reasonKeys ?? []).map((k) => (
                            <Chip
                              key={k}
                              size="small"
                              variant="outlined"
                              label={getReasonLabel(k)}
                            />
                          ))}
                          {(r.helpKeys ?? []).map((k) => (
                            <Chip
                              key={k}
                              size="small"
                              color="secondary"
                              label={getReasonLabel(k)}
                            />
                          ))}
                        </Stack>

                        {r.declinedBy && (
                          <div className="goal-reports-contact">
                            <PersonIcon fontSize="inherit" />
                            <span>{r.declinedBy}</span>
                          </div>
                        )}

                        {r.note && (
                          <p className="goal-reports-note">{r.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>

      {/* The admin has to take a position: is this a good enough reason? */}
      {selected.length > 0 && (
        <div className="goal-reports-decision">
          {followUpMode ? (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                What should the supervisor follow up on?
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                autoFocus
                placeholder="e.g. Ask about end-cap space after the reset"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              <strong>Accept</strong> takes the account off the goal.{" "}
              <strong>Follow up</strong> keeps it on and sends it to the rep&rsquo;s
              supervisor.
            </Typography>
          )}
        </div>
      )}

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {selected.length > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mr: "auto" }}
          >
            {selected.length} selected
          </Typography>
        )}

        {followUpMode ? (
          <>
            <Button onClick={() => setFollowUpMode(false)} disabled={busy}>
              Back
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={runFollowUp}
              disabled={busy || !selectedOpenReportIds.length}
            >
              Send to supervisor
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={busy}>
              Close
            </Button>

            <Button
              onClick={() => setFollowUpMode(true)}
              disabled={busy || !selectedOpenReportIds.length}
            >
              Follow up
            </Button>

            <Button
              variant="contained"
              color="warning"
              onClick={runAccept}
              disabled={busy || !selected.length}
            >
              Accept &amp; remove
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GoalReportsReviewModal;
export type { AccountGroup };
