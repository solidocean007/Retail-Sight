import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Box,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import NotificationStatsCard from "./NotificationsStatsCard";

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
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    if (!developerNotificationId) return;

    try {
      setLoading(true);
      setError(null);

      const res: any = await getNotificationAnalytics({
        developerNotificationId,
      });

      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics failed:", err);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [developerNotificationId]);

  useEffect(() => {
    if (!open || !developerNotificationId) return;

    loadAnalytics();

    // Optional: live refresh while modal is open
    const interval = setInterval(loadAnalytics, 5000);
    return () => clearInterval(interval);
  }, [open, developerNotificationId, loadAnalytics]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setAnalytics(defaultAnalytics);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Notification Analytics</DialogTitle>

      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && <Box color="error.main">{error}</Box>}

        {!loading && !error && (
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeveloperAnalyticsModal;
