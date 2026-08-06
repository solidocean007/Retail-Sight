import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../utils/firebase";

type OrphanedUser = {
  uid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: string | null;
  role: string | null;
  status: string | null;
};

/**
 * Scans users/{uid} docs for ones whose uid has no matching Firebase Auth
 * account. Backed by the findOrphanedUsers callable — see that file for
 * why this can happen (invite-accept partial failure).
 */
const OrphanedUsersPanel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<number | null>(null);
  const [orphaned, setOrphaned] = useState<OrphanedUser[] | null>(null);
  const [repairingUid, setRepairingUid] = useState<string | null>(null);
  const [repairResults, setRepairResults] = useState<
    Record<string, { email: string; resetLink: string } | string>
  >({});

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const findOrphanedUsers = httpsCallable(functions, "findOrphanedUsers");
      const res = await findOrphanedUsers();
      const data = res.data as { scanned: number; orphaned: OrphanedUser[] };
      setScanned(data.scanned);
      setOrphaned(data.orphaned);
    } catch (err: any) {
      setError(err?.message || "Scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async (uid: string) => {
    setRepairingUid(uid);
    try {
      const repairOrphanedUser = httpsCallable(functions, "repairOrphanedUser");
      const res = await repairOrphanedUser({ uid });
      const data = res.data as { email: string; resetLink: string };
      setRepairResults((prev) => ({
        ...prev,
        [uid]: { email: data.email, resetLink: data.resetLink },
      }));
    } catch (err: any) {
      setRepairResults((prev) => ({
        ...prev,
        [uid]: err?.message || "Repair failed.",
      }));
    } finally {
      setRepairingUid(null);
    }
  };

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">
          Orphaned users (Firestore doc, no Auth account)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Checks every users/&#123;uid&#125; doc against Firebase Auth and
          lists the ones with no matching Auth account — leftover records
          from a partially-failed invite acceptance. "Repair" recreates the
          missing Auth account with the same uid and hands back a
          password-reset link, rather than deleting the Firestore doc (which
          can silently orphan things like a reportsTo pointer from anyone
          who reports to this person).
        </Typography>

        <Button
          variant="outlined"
          onClick={handleScan}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? "Scanning…" : "Scan for orphaned users"}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {scanned !== null && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            Scanned {scanned} user doc{scanned === 1 ? "" : "s"} —{" "}
            {orphaned?.length || 0} orphaned.
          </Typography>
        )}

        {!!orphaned?.length && (
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Company ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>UID</TableCell>
                <TableCell>Fix</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orphaned.map((u) => {
                const repairResult = repairResults[u.uid];
                return (
                  <TableRow key={u.uid}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.companyId}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>{u.status}</TableCell>
                    <TableCell style={{ fontFamily: "monospace" }}>
                      {u.uid}
                    </TableCell>
                    <TableCell>
                      {!repairResult && (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={repairingUid === u.uid}
                          onClick={() => handleRepair(u.uid)}
                        >
                          {repairingUid === u.uid ? "Repairing…" : "Repair"}
                        </Button>
                      )}
                      {repairResult && typeof repairResult === "string" && (
                        <Typography variant="caption" color="error">
                          {repairResult}
                        </Typography>
                      )}
                      {repairResult && typeof repairResult !== "string" && (
                        <Typography
                          variant="caption"
                          component="a"
                          href={repairResult.resetLink}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Account recreated — password reset link
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default OrphanedUsersPanel;
