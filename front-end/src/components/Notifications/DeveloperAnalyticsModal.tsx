// DeveloperAnalyticsModal.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import NotificationStatsCard from "./NotificationsStatsCard";

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

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const getNotificationAnalytics = httpsCallable(
    functions,
    "getNotificationAnalytics"
  );

  useEffect(() => {
  if (!developerNotificationId || !open) return;

  const load = async () => {
    try {
      setLoading(true);

      const res: any = await getNotificationAnalytics({
        developerNotificationId,
      });

      console.log("Analytics response:", res);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Analytics failed:", err);
    } finally {
      setLoading(false);
    }
  };

  load();
}, [developerNotificationId, open]);


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Notification Analytics</DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}

        {!loading && analytics && (
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
