import { useEffect, useState, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import NotificationStatsCard from "./NotificationsStatsCard";

type RecipientRow = {
  uid: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyName: string;
  readAt: unknown | null;
  clickedAt: unknown | null;
  emailClickedAt: unknown | null;
  emailedAt: unknown | null;
  clickedFrom: string | null;
};

type AnalyticsType = {
  sent: number;
  read: number;
  clicked: number;
  ctr: number;
  readRate: number;
  clickedFrom: {
    push: number;
    modal: number;
    dropdown: number;
    email?: number;
  };
  recipients?: RecipientRow[];
};

const defaultAnalytics: AnalyticsType = {
  sent: 0,
  read: 0,
  clicked: 0,
  ctr: 0,
  readRate: 0,
  clickedFrom: {
    push: 0,
    modal: 0,
    dropdown: 0,
    email: 0,
  },
  recipients: [],
};

type Props = {
  open: boolean;
  onClose: () => void;
  developerNotificationId: string | null;
};

const DeveloperAnalyticsModal = ({
  open,
  onClose,
  developerNotificationId,
}: Props) => {
  const functions = getFunctions();
  const getNotificationAnalytics = httpsCallable(
    functions,
    "getNotificationAnalytics",
  );

  const [analytics, setAnalytics] = useState<AnalyticsType>(defaultAnalytics);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevents overlapping calls when several counters update at once
  const inFlightRef = useRef(false);

  const loadAnalytics = useCallback(async () => {
    if (!developerNotificationId) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const res: any = await getNotificationAnalytics({
        developerNotificationId,
      });

      setAnalytics(res.data);
      setHasLoaded(true);
    } catch (err) {
      console.error("Analytics failed:", err);
      setError("Failed to load analytics.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [developerNotificationId]);

  useEffect(() => {
    if (!open || !developerNotificationId) return;

    // The per-recipient breakdown comes from a privileged collection-group
    // query, so it can't be streamed to the client directly. Instead we
    // listen to the parent doc — its stats counters change whenever someone
    // reads or clicks — and use that as the refresh trigger. Same liveness
    // as the old 5s poll, but it only calls when something actually changed.
    // onSnapshot fires immediately, which also covers the initial load.
    const unsubscribe = onSnapshot(
      doc(db, "developerNotifications", developerNotificationId),
      () => {
        loadAnalytics();
      },
      (err) => {
        console.error("Analytics listener failed:", err);
        loadAnalytics(); // fall back to a one-shot read
      },
    );

    return unsubscribe;
  }, [open, developerNotificationId, loadAnalytics]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setAnalytics(defaultAnalytics);
      setError(null);
      setLoading(false);
      setHasLoaded(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Notification Analytics</DialogTitle>

      <DialogContent>
        {/* Spinner only on first load — background refreshes shouldn't
            blank out the numbers you're reading. */}
        {loading && !hasLoaded && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && <Box color="error.main">{error}</Box>}

        {hasLoaded && !error && (
          <>
            <NotificationStatsCard
              sent={analytics.sent}
              read={analytics.read}
              clicked={analytics.clicked}
              ctr={analytics.ctr}
              readRate={analytics.readRate}
            />

            <NotificationEngagementBreakdown
              clickedFrom={analytics.clickedFrom}
            />

            {!!analytics.recipients?.length && (
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Recipients ({analytics.recipients.length})
                </Typography>
                <TableContainer sx={{ maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Emailed</TableCell>
                        <TableCell>Read in app</TableCell>
                        <TableCell>Clicked</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.recipients.map((r) => (
                        <TableRow key={r.uid ?? r.email}>
                          <TableCell>
                            {`${r.firstName} ${r.lastName}`.trim() || "—"}
                          </TableCell>
                          <TableCell>{r.email || "—"}</TableCell>
                          <TableCell>{r.companyName || "—"}</TableCell>
                          <TableCell>{r.role || "—"}</TableCell>
                          <TableCell>
                            {r.emailedAt ? (
                              <Chip size="small" label="Sent" />
                            ) : (
                              <Chip size="small" label="—" />
                            )}
                          </TableCell>
                          <TableCell>
                            {r.readAt ? (
                              <Chip size="small" color="success" label="Read" />
                            ) : (
                              <Chip size="small" label="Unread" />
                            )}
                          </TableCell>
                          <TableCell>
                            {r.clickedAt ? (
                              <Chip
                                size="small"
                                color="primary"
                                label={r.clickedFrom || "clicked"}
                              />
                            ) : (
                              <Chip size="small" label="No" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeveloperAnalyticsModal;
