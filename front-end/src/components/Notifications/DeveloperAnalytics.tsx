import { useEffect, useState, useCallback } from "react";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import NotificationStatsCard from "../Notifications/NotificationsStatsCard";
import { getFunctions, httpsCallable } from "firebase/functions";

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

const DeveloperAnalytics = ({
  developerNotificationId,
}: {
  developerNotificationId: string | null;
}) => {
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
      console.error("Analytics fetch failed:", err);
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [developerNotificationId]);

  useEffect(() => {
    if (!developerNotificationId) return;

    loadAnalytics();
    const interval = setInterval(loadAnalytics, 5000);

    return () => clearInterval(interval);
  }, [loadAnalytics]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (!developerNotificationId) return null;

  return (
    <div className="developer-analytics">
      {loading && <div>Loading analytics…</div>}
      {error && <div className="error-text">{error}</div>}

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
    </div>
  );
};

export default DeveloperAnalytics;
