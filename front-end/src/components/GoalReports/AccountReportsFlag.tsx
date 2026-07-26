// src/components/GoalReports/AccountReportsFlag.tsx
//
// The inline admin affordance on an account row: a small caution pill shown
// only when that account actually has reports. Clicking opens the per-account
// detail modal.
//
// Intentionally quiet — most accounts will have nothing, and the admin's main
// entry point is the goal-level review. This is for when they're already
// looking at a specific account and want the story behind it.

import React, { useState } from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { GoalAccountReport, isHelpRequest } from "../../types/goalReports";
import AccountReportsDetailModal from "./AccountReportsDetailModal";
import "./goalReportsReview.css";

interface Props {
  accountName?: string;
  reports: GoalAccountReport[];
  isRemoved?: boolean;
}

const AccountReportsFlag: React.FC<Props> = ({
  accountName,
  reports,
  isRemoved = false,
}) => {
  const [open, setOpen] = useState(false);

  if (!reports.length) return null;

  const openReports = reports.filter((r) => !r.resolvedAt);
  const needsHelp = openReports.some(isHelpRequest);
  const allHandled = openReports.length === 0;

  const label = needsHelp
    ? "Needs help"
    : allHandled
      ? `${reports.length} handled`
      : `${openReports.length} issue${openReports.length > 1 ? "s" : ""}`;

  return (
    <>
      <button
        type="button"
        className={`goal-reports-flag ${needsHelp ? "needs-help" : ""} ${
          allHandled ? "handled" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
      >
        <WarningAmberIcon fontSize="inherit" style={{ marginRight: 4 }} />
        {label}
      </button>

      <AccountReportsDetailModal
        open={open}
        onClose={() => setOpen(false)}
        accountName={accountName}
        reports={reports}
        isRemoved={isRemoved}
      />
    </>
  );
};

export default AccountReportsFlag;
