import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { selectCompanyUsers, selectUser } from "../Slices/userSlice";
import {
  subscribeToCompanyOpenGoalAccountReports,
  subscribeToSupervisorFollowUps,
} from "../utils/goalReports/goalAccountReportHelpers";

const ADMIN_ROLES = new Set(["admin", "super-admin", "developer"]);

/** Live count shown beside Team Feedback in the dashboard menu. */
export const useTeamFeedbackCount = () => {
  const user = useSelector(selectUser);
  const selectedCompanyUsers = useSelector(selectCompanyUsers);
  const companyUsers = useMemo(
    () => selectedCompanyUsers ?? [],
    [selectedCompanyUsers],
  );
  const [count, setCount] = useState(0);

  const directReportUids = useMemo(
    () =>
      companyUsers
        .filter(
          (candidate) =>
            candidate.reportsTo === user?.uid &&
            (candidate.status ?? "active") === "active",
        )
        .map((candidate) => candidate.uid),
    [companyUsers, user?.uid],
  );

  useEffect(() => {
    if (!user?.companyId || !user.role) {
      setCount(0);
      return;
    }

    const onError = (error: Error) => {
      console.error("Team feedback badge listener failed:", error);
      setCount(0);
    };

    if (ADMIN_ROLES.has(user.role)) {
      return subscribeToCompanyOpenGoalAccountReports(
        user.companyId,
        (reports) => setCount(reports.length),
        onError,
      );
    }

    if (user.role === "supervisor") {
      return subscribeToSupervisorFollowUps(
        user.companyId,
        directReportUids,
        (reports) => setCount(reports.length),
        onError,
      );
    }

    setCount(0);
  }, [directReportUids, user?.companyId, user?.role]);

  return count;
};
