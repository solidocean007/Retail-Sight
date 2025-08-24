// components/admin/IntegrationsManager.tsx
import { useState } from "react";
import { Box, Chip, IconButton, Menu, MenuItem, Tooltip, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

type ProviderKey = "gallo" | "manualGoals"; // extend later
type IntegrationConfig = { enabled: boolean; apiKeyId?: string };
type IntegrationsMap = Partial<Record<ProviderKey, IntegrationConfig>>;

export default function IntegrationsManager({
  companyId,
  value,
}: {
  companyId: string;
  value?: IntegrationsMap;
}) {
  const integrations = value ?? {};
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openApiModal, setOpenApiModal] = useState<null | ProviderKey>(null);
  const [apiKeyId, setApiKeyId] = useState("");

  const handleToggle = async (provider: ProviderKey, enabled: boolean) => {
    await setDoc(
      doc(db, "companies", companyId),
      { integrations: { [provider]: { ...(integrations[provider] || {}), enabled } } },
      { merge: true }
    );
  };

  const handleSaveApiKey = async (provider: ProviderKey) => {
    await setDoc(
      doc(db, "companies", companyId),
      { integrations: { [provider]: { ...(integrations[provider] || {}), enabled: true, apiKeyId } } },
      { merge: true }
    );
    setOpenApiModal(null);
    setApiKeyId("");
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {/* Current enabled providers */}
      {Object.entries(integrations)
        .filter(([, cfg]) => cfg?.enabled)
        .map(([key, cfg]) => (
          <Chip key={key} size="small" label={key} color="success" variant="outlined" />
        ))}

      <Tooltip title="Manage integrations">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {/* Gallo */}
        <MenuItem onClick={() => handleToggle("gallo", !(integrations.gallo?.enabled))}>
          {integrations.gallo?.enabled ? "Disable Gallo" : "Enable Gallo"}
        </MenuItem>
        <MenuItem onClick={() => { setOpenApiModal("gallo"); setAnchorEl(null); }}>
          Set Gallo API Key ID…
        </MenuItem>

        {/* Manual Goals (no key) */}
        <MenuItem onClick={() => handleToggle("manualGoals", !(integrations.manualGoals?.enabled))}>
          {integrations.manualGoals?.enabled ? "Disable Manual Goals" : "Enable Manual Goals"}
        </MenuItem>
      </Menu>

      {/* Optional API key modal */}
      <Dialog open={!!openApiModal} onClose={() => setOpenApiModal(null)}>
        <DialogTitle>Set API Key ID for {openApiModal}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="apiKeyId (reference only)"
            value={apiKeyId}
            onChange={(e) => setApiKeyId(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApiModal(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSaveApiKey(openApiModal!)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
