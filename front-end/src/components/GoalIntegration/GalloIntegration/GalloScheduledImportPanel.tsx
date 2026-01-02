import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress } from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import "./galloScheduledImport.css";

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
  canRunManually = false,
}) => {
  const functions = getFunctions();
  const [status, setStatus] = useState<ScheduledImportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);

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
      <header>
        <h3>🔁 Gallo Axis Program Sync</h3>
        <p className="subtext">
          Programs and goals are automatically synced from Gallo Axis.
        </p>
      </header>

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
            className={`status-pill ${
              status.lastRunStatus ?? "unknown"
            }`}
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
        </div>
      )}
    </section>
  );
};

export default GalloScheduledImportPanel;
