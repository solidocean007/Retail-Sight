// src/components/GoalReports/GalloGoalFeedback.tsx
//
// Admin feedback review for a Gallo goal. Self-contained so GalloGoalsTable
// only has to drop it into a row.
//
// TWO IDS, and mixing them up silently breaks everything:
//   goal.goalDetails.goalId — what reports are keyed on (matches what
//                             MyGalloGoalCard passes when a rep files one)
//   goal.id                 — the Firestore document id, needed to write
//                             accounts[].status back
//
// Removal on Gallo is free: flipping accounts[].status to "disabled" is
// already filtered out by every Gallo view, so completion math updates itself.

import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { selectUser, selectCompanyUsers } from "../../Slices/userSlice";
import { useGoalAccountReports } from "../../hooks/useGoalAccountReports";
import GoalReportsReviewModal, { AccountGroup } from "./GoalReportsReviewModal";
import {
  notifyReportDecision,
  resolveGoalAccountReports,
} from "../../utils/goalReports/goalAccountReportHelpers";
import { setGalloAccountStatus } from "../../utils/goalReports/goalAccountRemoval";
import { GoalAccountReport } from "../../types/goalReports";
import "./goalReportsReview.css";

interface Props {
  /** Firestore document id — used to write accounts[].status. */
  galloGoalDocId: string;
  /** goalDetails.goalId — what reports are keyed on. */
  reportGoalId: string;
  goalTitle?: string;
  /** oppIds already disabled, so the review can render them as removed. */
  disabledOppIds?: string[];
}

const GalloGoalFeedback: React.FC<Props> = ({
  galloGoalDocId,
  reportGoalId,
  goalTitle,
  disabledOppIds = [],
}) => {
  const user = useSelector(selectUser);
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const [open, setOpen] = useState(false);

  const { reports } = useGoalAccountReports(reportGoalId);

  const openReports = reports.filter((r) => !r.resolvedAt);
  const helpCount = openReports.filter((r) => r.helpKeys?.length).length;

  const supervisorByUid = useMemo(() => {
    const byUid = new Map(companyUsers.map((u) => [u.uid, u]));
    const map: Record<string, string> = {};

    companyUsers.forEach((u) => {
      const sup = u.reportsTo ? byUid.get(u.reportsTo) : undefined;
      if (sup) {
        map[u.uid] = `${sup.firstName ?? ""} ${sup.lastName ?? ""}`.trim();
      }
    });

    return map;
  }, [companyUsers]);

  const actorName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "An admin";

  const notifyByRep = async (
    affected: GoalAccountReport[],
    resolution: "accepted" | "follow_up",
    note?: string,
  ) => {
    if (!user?.uid) return;

    const byRep = new Map<string, string[]>();
    affected.forEach((r) => {
      const names = byRep.get(r.userId) ?? [];
      names.push(r.accountName || r.oppId || "an account");
      byRep.set(r.userId, names);
    });

    await Promise.all(
      [...byRep.entries()].map(([targetUserId, accountNames]) =>
        notifyReportDecision({
          actorUserId: user.uid,
          actorName,
          targetUserId,
          goalId: reportGoalId,
          goalTitle,
          resolution,
          accountNames,
          resolutionNote: note,
        }),
      ),
    );
  };

  const handleRequestFollowUp = async (reportIds: string[], note: string) => {
    if (!user?.uid || !reportIds.length) return;

    await resolveGoalAccountReports(reportIds, "follow_up", user.uid, note);
    await notifyByRep(
      reports.filter((r) => reportIds.includes(r.id)),
      "follow_up",
      note,
    );
  };

  const handleAccept = async (groups: AccountGroup[]) => {
    if (!user?.uid || !groups.length) return;

    // Gallo identifies accounts by oppId; anything without one can't be
    // disabled on the goal doc (unmatched account), so skip those rather
    // than writing a bad entry.
    const oppIds = groups
      .map((g) => g.oppId)
      .filter((id): id is string => Boolean(id));

    if (oppIds.length) {
      await setGalloAccountStatus(galloGoalDocId, oppIds, "disabled");
    }

    const affected = groups.flatMap((g) =>
      g.reports.filter((r) => !r.resolvedAt),
    );

    await resolveGoalAccountReports(
      affected.map((r) => r.id),
      "accepted",
      user.uid,
    );

    await notifyByRep(affected, "accepted");
  };

  // Nothing filed and nothing handled — don't add noise to the row.
  if (!reports.length) return null;

  return (
    <>
      <button
        type="button"
        className={`goal-reports-flag ${helpCount > 0 ? "needs-help" : ""} ${
          openReports.length === 0 ? "handled" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <WarningAmberIcon fontSize="inherit" style={{ marginRight: 4 }} />
        {helpCount > 0
          ? "Needs help"
          : openReports.length > 0
            ? `${openReports.length} issue${openReports.length > 1 ? "s" : ""}`
            : "Feedback"}
      </button>

      <GoalReportsReviewModal
        open={open}
        onClose={() => setOpen(false)}
        goalTitle={goalTitle}
        reports={reports}
        removedKeys={disabledOppIds}
        supervisorByUid={supervisorByUid}
        onAccept={handleAccept}
        onRequestFollowUp={handleRequestFollowUp}
      />
    </>
  );
};

export default GalloGoalFeedback;
