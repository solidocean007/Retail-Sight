import { useEffect, useState } from "react";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import NotificationStatsCard from "../Notifications/NotificationsStatsCard";
import { getFunctions, httpsCallable } from "firebase/functions";

const DeveloperAnalytics = ({
  developerNotificationId,
}: {
  developerNotificationId: string;
}) => {
  const functions = getFunctions();

  const [analytics, setAnalytics] = useState({
    sent: 0,
    read: 0,
    clicked: 0,
    ctr: 0,
    readRate: 0,
    clickedFrom: {
      push: 0,
      modal: 0,
      dropdown: 0,
    },
  });
  const getNotificationAnalytics = httpsCallable(
    functions,
    "getNotificationAnalytics",
  );

  useEffect(() => {
    if (!developerNotificationId) return;

    loadAnalytics(developerNotificationId);
  }, [developerNotificationId]);

  const loadAnalytics = async (id: string) => {
    const res: any = await getNotificationAnalytics({
      developerNotificationId: id,
    });

    setAnalytics(res.data);
  };
  return (
    <div className="deverloper-analytics">
      {analytics && (
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
