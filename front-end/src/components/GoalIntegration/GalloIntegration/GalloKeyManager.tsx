import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Box,
  Typography,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  DialogActions,
} from "@mui/material";
import React, { useState } from "react";
import { KeyStatusType } from "./GalloIntegration";
interface GalloKeyManagerProps {
  selectedEnv: "prod" | "dev";
  setSelectedEnv: React.Dispatch<React.SetStateAction<"prod" | "dev">>;
  keyStatus: KeyStatusType | null;
}
const GalloKeyManager: React.FC<GalloKeyManagerProps> = ({
  selectedEnv,
  setSelectedEnv,
  keyStatus,
}) => {
  const functions = getFunctions();
  const [openKeyModal, setOpenKeyModal] = useState(false);
  const [openDeleteKeyModal, setOpenDeleteKeyModal] = useState(false);
  const [modalEnv, setModalEnv] = useState<"prod" | "dev">("dev");
  const [modalKey, setModalKey] = useState("");

  const isProduction = selectedEnv === "prod";

  const setOrRotateKey = async (env: "prod" | "dev", key: string) => {
    if (!key) {
      alert("Please enter a key value.");
      return;
    }
    try {
      const upsertGalloAxisKey = httpsCallable<
        { env: "prod" | "dev"; key: string },
        { success: boolean }
      >(functions, "upsertGalloAxisKey");

      const res = await upsertGalloAxisKey({ env, key });
      if (res.data.success) {
        console.log("✅ Key upserted successfully");
        await refreshKeyStatus();
      } else {
        alert("Failed to set key.");
      }
    } catch (err) {
      console.error("setOrRotateKey error:", err);
      alert("Error setting key. Check console for details.");
    }
  };

  const deleteKey = async (env: "prod" | "dev") => {
    try {
      const deleteGalloAxisKey = httpsCallable<
        { env: "prod" | "dev" },
        { success: boolean }
      >(functions, "deleteGalloAxisKey");

      const res = await deleteGalloAxisKey({ env });
      if (res.data.success) {
        console.log("✅ Key deleted successfully");
        await refreshKeyStatus();
      } else {
        alert("Failed to delete key.");
      }
    } catch (err) {
      console.error("deleteKey error:", err);
      alert("Error deleting key. Check console for details.");
    }
  };

  const refreshKeyStatus = async () => {
    try {
      const getExternalApiKeyStatus = httpsCallable<
        { integration: string },
        {
          prod: { exists: boolean; lastFour?: string; updatedAt?: any };
          dev: { exists: boolean; lastFour?: string; updatedAt?: any };
        }
      >(functions, "getExternalApiKeyStatus");

      const res = await getExternalApiKeyStatus({ integration: "galloAxis" });
      setKeyStatus(res.data);
    } catch (err) {
      console.error("refreshKeyStatus error:", err);
    }
  };
  return (
    <>
      {/* 🔑 Key Management Section */}
      <Box
        sx={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          p: 2,
          backgroundColor: "#fafafa",
        }}
      >
        <Typography variant="h6" gutterBottom>
          🔑 Gallo Axis Key Management
        </Typography>

        {/* Env toggle */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography
            sx={{
              fontWeight: !isProduction ? "bold" : "normal",
              color: !isProduction ? "text.secondary" : "text.disabled",
            }}
          >
            Development
          </Typography>

          <Switch
            checked={isProduction}
            onChange={() => setSelectedEnv(isProduction ? "dev" : "prod")}
            color="primary"
          />

          <Typography
            sx={{
              fontWeight: isProduction ? "bold" : "normal",
              color: isProduction ? "primary.main" : "text.secondary",
            }}
          >
            Production
          </Typography>
        </Box>

        {/* Key status */}
        <Typography variant="body2" sx={{ mb: 1 }}>
          Current Keys — prod:{" "}
          {keyStatus?.prod?.exists ? `••••${keyStatus.prod.lastFour}` : "none"},
          dev:{" "}
          {keyStatus?.dev?.exists ? `••••${keyStatus.dev.lastFour}` : "none"}
        </Typography>

        {/* Key actions */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setModalEnv(selectedEnv);
              setOpenKeyModal(true);
            }}
          >
            Set/Rotate
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDeleteKeyModal(true)}
          >
            Delete Key
          </Button>
        </Box>
      </Box>
      <Dialog
        open={openDeleteKeyModal}
        onClose={() => setOpenDeleteKeyModal(false)}
      >
        <DialogTitle>Delete Gallo Axis API Key</DialogTitle>
        <DialogContent>
          <Typography color="error" sx={{ mb: 2 }}>
            ⚠️ Deleting the {selectedEnv.toUpperCase()} key will break all
            program imports for that environment until a new key is set. This
            action cannot be undone.
          </Typography>
          <Typography variant="body2">
            Are you sure you want to delete the{" "}
            <strong>{selectedEnv.toUpperCase()}</strong> key?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              await deleteKey(selectedEnv); // pass env into your delete handler
              setOpenDeleteKeyModal(false);
            }}
          >
            Delete Key
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openKeyModal} onClose={() => setOpenKeyModal(false)}>
        <DialogTitle>Set or Rotate Gallo Axis API Key</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <Typography variant="body2" color="warning.main">
            ⚠️ Rotating this key will immediately replace the existing{" "}
            {modalEnv.toUpperCase()} key.
          </Typography>

          <FormControl fullWidth>
            <InputLabel id="env-label">Environment</InputLabel>
           
            Rotating the {selectedEnv === "prod" ? "Production" : "Development"}
          </FormControl>

          <TextField
            fullWidth
            label={`Enter ${modalEnv} API Key`}
            type="password"
            value={modalKey}
            onChange={(e) => setModalKey(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenKeyModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await setOrRotateKey(modalEnv, modalKey);
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
