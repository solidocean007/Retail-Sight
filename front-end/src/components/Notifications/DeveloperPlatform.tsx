import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";
import { getFunctions, httpsCallable } from "firebase/functions";
import { selectUser } from "../../Slices/userSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";

const DeveloperPlatform = () => {
  const dashboardUser = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const functions = getFunctions();

  const isDeveloper = dashboardUser?.role === "developer";

  const [connectionId, setConnectionId] = useState("");
  const [repairLoading, setRepairLoading] = useState(false);

  const handleRepair = async () => {
    if (!connectionId.trim()) return;

    try {
      setRepairLoading(true);

      const fn = httpsCallable(functions, "repairConnectionVisibility");

      const res: any = await fn({
        connectionId: connectionId.trim(),
      });

      dispatch(
        showMessage(
          `Visibility repaired. Posts touched: ${res.data?.touchedPosts || 0}`,
        ),
      );

      setConnectionId("");
    } catch (err: any) {
      dispatch(
        showMessage(
          err?.message || "Failed to repair connection visibility.",
        ),
      );
    } finally {
      setRepairLoading(false);
    }
  };

  return (
    <div className="developer-platform">
      <Box mb={4}>
        <Typography variant="h6" mb={1}>
          API Keys
        </Typography>

        {isDeveloper && (
          <Button variant="contained">
            Generate API Key
          </Button>
        )}
      </Box>

      <Box mb={4}>
        <Typography variant="h6" mb={1}>
          Repair Connection Visibility
        </Typography>

        <TextField
          fullWidth
          size="small"
          label="Connection ID"
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleRepair}
          disabled={!connectionId || repairLoading}
        >
          {repairLoading ? "Repairing..." : "Run Repair"}
        </Button>
      </Box>

      <Box>
        <Typography variant="h6">
          Integrations System Status
        </Typography>
      </Box>
    </div>
  );
};

export default DeveloperPlatform;
