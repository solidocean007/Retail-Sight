import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import React, { useState } from "react";
import { KeyStatusType } from "./GalloIntegration";
import "./galloKeyManager.css";

interface GalloKeyManagerProps {
  selectedEnv: "prod" | "dev";
  setSelectedEnv: React.Dispatch<React.SetStateAction<"prod" | "dev">>;
  keyStatus: KeyStatusType | null;
  setKeyStatus: React.Dispatch<React.SetStateAction<KeyStatusType | null>>;
}

const GalloKeyManager: React.FC<GalloKeyManagerProps> = ({
  selectedEnv,
  setSelectedEnv,
  keyStatus,
  setKeyStatus,
}) => {
  const functions = getFunctions();
  const [openKeyModal, setOpenKeyModal] = useState(false);
  const [openDeleteKeyModal, setOpenDeleteKeyModal] = useState(false);
  const [modalKey, setModalKey] = useState("");

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

  return (
    <>
      <div className="gallo-key-manager">
        <div className="gallo-key-header">🔑 Gallo Axis Key Management</div>

        {/* Env selector */}
        <div className="env-selector">
          <button
            className={`env-btn ${selectedEnv === "dev" ? "active" : ""}`}
            onClick={() => setSelectedEnv("dev")}
          >
            Development
          </button>
          <button
            className={`env-btn ${selectedEnv === "prod" ? "active" : ""}`}
            onClick={() => setSelectedEnv("prod")}
          >
            Production
          </button>
        </div>

        {/* Status */}
        <div className="key-status">
          prod:{" "}
          {keyStatus?.prod?.exists ? `••••${keyStatus.prod.lastFour}` : "none"} |
          dev:{" "}
          {keyStatus?.dev?.exists ? `••••${keyStatus.dev.lastFour}` : "none"}
        </div>

        {/* Actions */}
        <div className="key-actions">
          <Button variant="contained" onClick={() => setOpenKeyModal(true)}>
            Set / Rotate
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDeleteKeyModal(true)}
          >
            Delete Key
          </Button>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={openDeleteKeyModal} onClose={() => setOpenDeleteKeyModal(false)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography color="error">
            This will immediately break imports for{" "}
            <strong>{selectedEnv.toUpperCase()}</strong>.
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

      {/* Set / rotate dialog */}
      <Dialog open={openKeyModal} onClose={() => setOpenKeyModal(false)}>
        <DialogTitle>Set / Rotate API Key</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label={`${selectedEnv.toUpperCase()} API Key`}
            value={modalKey}
            onChange={(e) => setModalKey(e.target.value)}
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

export default GalloKeyManager;
