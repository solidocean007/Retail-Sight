import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress } from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";

import "./galloScheduledImportPanel.css";
import { useSelector } from "react-redux";
import { selectCompanyUsers } from "../../../Slices/userSlice";

type ScheduledImportStatus = {
  env: "prod" | "dev";
  lastRunAt?: number; // unix
  nextRunAt?: number; // unix
  lastRunStatus?: "success" | "error";
  lastError?: string;
};

interface Props {
  companyId: string;
  canRunManually?: boolean; // super-admin / dev only
}

const GalloScheduledImportPanel: React.FC<Props> = ({
  companyId,
  canRunManually,
}) => {
  const users = useSelector(selectCompanyUsers);
  const admins = users?.filter((u) => u.role?.includes("admin")) || [];
  const functions = getFunctions();
  const [status, setStatus] = useState<ScheduledImportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [savingNotify, setSavingNotify] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadNotifySettings = async () => {
      const ref = doc(db, "companies", companyId, "integrations", "galloAxis");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setNotifyEnabled(!!snap.data()?.notifyOnProgramSync);
        setEmails(snap.data()?.notificationEmails ?? []);
      }
    };

    loadNotifySettings();
  }, [companyId]);

  const saveNotifySettings = async () => {
    setSavingNotify(true);
    try {
      await setDoc(
        doc(db, "companies", companyId, "integrations", "galloAxis"),
        {
          notifyOnProgramSync: notifyEnabled,
          notificationEmails: emails.filter(Boolean),
        },
        { merge: true }
      );
    } finally {
      setSavingNotify(false);
    }
  };

  const fetchStatus = async () => {
    const fn = httpsCallable(functions, "getGalloScheduledImportStatus");
    const res = await fn({ companyId });
    setStatus(res.data as ScheduledImportStatus);
  };

  const runNow = async () => {
    if (!canRunManually) return;
    setRunningNow(true);
    try {
      const fn = httpsCallable(functions, "runGalloScheduledImportNow");
      await fn({ companyId });
      await fetchStatus();
    } finally {
      setRunningNow(false);
    }
  };

  useEffect(() => {
    if (status?.lastRunStatus === "success") {
      setExpanded(false);
    }
  }, [status?.lastRunStatus]);

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Container className="gallo-scheduled-panel">
        <CircularProgress />
      </Container>
    );
  }

  if (!status) {
    return (
      <Container className="gallo-scheduled-panel">
        <Typography color="error">
          Failed to load scheduled import status.
        </Typography>
      </Container>
    );
  }

  return (
    <section className="gallo-scheduled-panel">
      <header className="panel-header">
        <div className="header-main">
          <h3>🔁 Gallo Axis Program Sync</h3>

          <div className={`status-pill ${status.lastRunStatus ?? "unknown"}`}>
            {status.lastRunStatus ?? "unknown"}
          </div>
        </div>

        <div className="header-meta">
          <span className="muted">
            Last run:{" "}
            {status.lastRunAt
              ? new Date(status.lastRunAt * 1000).toLocaleString()
              : "Never"}
          </span>

          <button
            className="link-button"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide details ▲" : "Show details ▼"}
          </button>
        </div>
      </header>

      {expanded && (
        <>
          {status.lastRunAt && status.lastRunStatus === "success" && (
            <small className="helper-text">
              Program sync is active. Future updates run automatically every 6
              hours. Gallo programs are automatically synced every 6 hours.
              Goals and accounts are imported manually only after review by
              admin.
            </small>
          )}
          <div className="status-grid">
            <div>
              <strong>Environment</strong>
              <div>{status.env.toUpperCase()}</div>
            </div>

            <div>
              <strong>Last Run</strong>
              <div>
                {status.lastRunAt
                  ? new Date(status.lastRunAt * 1000).toLocaleString()
                  : "Never"}
              </div>
            </div>

            <div>
              <strong>Status</strong>
              <div
                className={`status-pill ${status.lastRunStatus ?? "unknown"}`}
              >
                {status.lastRunStatus ?? "unknown"}
              </div>
            </div>

            <div>
              <strong>Next Run</strong>
              <div>
                {status.nextRunAt
                  ? new Date(status.nextRunAt * 1000).toLocaleString()
                  : "Scheduled"}
              </div>
            </div>
          </div>

          <section className="notify-section">
            <h4>📧 Notifications</h4>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => setNotifyEnabled(e.target.checked)}
              />
              Email admins when new programs are available
            </label>

            {notifyEnabled && (
              <>
                <div className="admin-email-list">
                  {admins
                    .filter((u): u is typeof u & { email: string } =>
                      Boolean(u.email)
                    )
                    .map((u) => {
                      const checked = emails.includes(u.email);

                      return (
                        <label key={u.uid} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setEmails((prev) =>
                                checked
                                  ? prev.filter((e) => e !== u.email)
                                  : [...prev, u.email]
                              );
                            }}
                          />
                          <span>
                            {u.firstName} {u.lastName}
                            <small className="muted"> ({u.email})</small>
                          </span>
                        </label>
                      );
                    })}
                </div>

                <button
                  className="btn-secondary save-notify-settings"
                  disabled={savingNotify}
                  onClick={saveNotifySettings}
                >
                  {savingNotify ? "Saving…" : "Save Notification Settings"}
                </button>

                <small className="helper-text">
                  A single summary email will be sent per sync run.
                </small>
              </>
            )}
          </section>

          {status.lastRunStatus === "error" && status.lastError && (
            <div className="error-box">
              <strong>Last Error</strong>
              <pre>{status.lastError}</pre>
            </div>
          )}

          {canRunManually && (
            <div className="actions">
              <button
                className="btn-secondary"
                disabled={runningNow}
                onClick={runNow}
              >
                {runningNow ? "Running…" : "Run Sync Now"}
              </button>
              {canRunManually && (
                <small className="helper-text">
                  Manual sync is for validation and troubleshooting only.
                </small>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default GalloScheduledImportPanel;
