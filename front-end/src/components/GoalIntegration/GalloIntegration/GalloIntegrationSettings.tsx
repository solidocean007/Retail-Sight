import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Container,
  CircularProgress,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { KeyStatusType } from "./GalloGoalImporter";
import "./galloIntegrationSettings.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../utils/firebase";

interface GalloIntegrationSettingsProps {
  companyId: string;
  keyStatus: KeyStatusType | null;
  setKeyStatus: (s: KeyStatusType | null) => void;
}

const GalloIntegrationSettings: React.FC<GalloIntegrationSettingsProps> = ({
  companyId,
  keyStatus,
  setKeyStatus,
}) => {
  const functions = getFunctions();
  const [openKeyModal, setOpenKeyModal] = useState(false);
  const [openDeleteKeyModal, setOpenDeleteKeyModal] = useState(false);
  const [modalKey, setModalKey] = useState("");
  const [selectedEnv, setSelectedEnv] = useState<"prod" | "dev" | null>(null);
  const [envLoading, setEnvLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const ref = doc(db, "companies", companyId, "integrations", "galloAxis");

    getDoc(ref)
      .then((snap) => {
        const env = snap.data()?.env;
        setSelectedEnv(env === "prod" ? "prod" : "dev");
      })
      .finally(() => {
        setEnvLoading(false);
      });
  }, [companyId]);

  useEffect(() => {
    refreshKeyStatus();
  }, []);

  const refreshKeyStatus = async () => {
    const fn = httpsCallable(functions, "getExternalApiKeyStatus");
    const res = await fn({ integration: "galloAxis" });
    setKeyStatus(res.data as KeyStatusType);
  };

  const setOrRotateKey = async () => {
    if (!modalKey) return;
    const fn = httpsCallable(functions, "upsertGalloAxisKey");
    await fn({ env: selectedEnv, key: modalKey });
    await refreshKeyStatus();
  };

  const deleteKey = async () => {
    const fn = httpsCallable(functions, "deleteGalloAxisKey");
    await fn({ env: selectedEnv });
    await refreshKeyStatus();
  };

  const canSelectDev = !!keyStatus?.dev?.exists;
  const canSelectProd = !!keyStatus?.prod?.exists;

  const setActiveEnv = async (env: "prod" | "dev") => {
    const ref = doc(db, "companies", companyId, "integrations", "galloAxis");
    await setDoc(ref, { env }, { merge: true });
    setSelectedEnv(env); // ← REQUIRED
  };

  if (envLoading) {
    return (
      <Container className="gallo-integration">
        <CircularProgress />
        <Typography>Loading Gallo environment…</Typography>
      </Container>
    );
  }

  if (!selectedEnv) {
    return (
      <Container className="gallo-integration">
        <Typography color="error">
          Failed to determine Gallo environment.
        </Typography>
      </Container>
    );
  }

  return (
    <>
      <section className="gallo-key-manager">
        <header className="gallo-key-header">
          <h3>🔌 Gallo Axis Integration</h3>
          <p className="gallo-subtext">
            This integration connects Displaygram to Gallo Axis for
            program-driven goal imports.
          </p>
        </header>

        {/* Active environment */}
        <div className="env-selector">
          <p className="env-label">Active Environment</p>
          <div className="env-buttons">
            <button
              disabled={!canSelectDev}
              className={`env-btn ${selectedEnv === "dev" ? "active" : ""}`}
              onClick={() => setActiveEnv("dev")}
            >
              Development
            </button>

            <button
              disabled={!canSelectProd}
              className={`env-btn ${selectedEnv === "prod" ? "active" : ""}`}
              onClick={() => setActiveEnv("prod")}
            >
              Production
            </button>
          </div>
        </div>

        {/* Key status */}
        <div className="key-status">
          <strong>Status</strong>
          <div>
            prod:{" "}
            {keyStatus?.prod?.exists
              ? `••••${keyStatus.prod.lastFour}`
              : "not configured"}
          </div>
          <div>
            dev:{" "}
            {keyStatus?.dev?.exists
              ? `••••${keyStatus.dev.lastFour}`
              : "not configured"}
          </div>
        </div>

        {/* Actions */}
        <div className="key-actions">
          <Button variant="contained" onClick={() => setOpenKeyModal(true)}>
            Set / Rotate Key
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDeleteKeyModal(true)}
          >
            Delete Key
          </Button>
        </div>
      </section>

      {/* Delete */}
      <Dialog
        open={openDeleteKeyModal}
        onClose={() => setOpenDeleteKeyModal(false)}
      >
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography color="error">
            Deleting the <strong>{selectedEnv?.toUpperCase()}</strong> key will
            immediately break all Gallo imports using that environment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await deleteKey();
              setOpenDeleteKeyModal(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set / rotate */}
      <Dialog open={openKeyModal} onClose={() => setOpenKeyModal(false)}>
        <DialogTitle>
          Set / Rotate {selectedEnv?.toUpperCase()} API Key
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="API Key"
            value={modalKey}
            onChange={(e) => setModalKey(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await setOrRotateKey();
              setOpenKeyModal(false);
              setModalKey("");
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GalloIntegrationSettings;
