import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
} from "@mui/material";
import {
  CompanyAccountType,
  UserType,
  GoalAssignmentType,
} from "../../utils/types";
import CloseIcon from "@mui/icons-material/Close";
import "./AssignmentsPreview.css";
import { TableVirtuoso } from "react-virtuoso";

interface AssignmentsPreviewProps {
  assignments: GoalAssignmentType[];
  accounts: CompanyAccountType[];
  users: UserType[];
  onRemoveAssignment: (accountNumber: string, uid: string) => void;
  onClearAll?: () => void;
  filteredAccounts: CompanyAccountType[]; // ✅ new
  assigneeType: "sales" | "supervisor"; // ✅ new
}

const AssignmentsPreview: React.FC<AssignmentsPreviewProps> = ({
  assignments,
  accounts,
  users,
  onRemoveAssignment,
  onClearAll,
  filteredAccounts,
  assigneeType,
}) => {
  if (!assignments.length) return null;
  const [searchTerm, setSearchTerm] = useState("");
  const uniqueAccounts = new Set(assignments.map((a) => a.accountNumber));
  const uniqueUsers = new Set(assignments.map((a) => a.uid));
  const [showUnassigned, setShowUnassigned] = useState(false);

  // 🧮 Group assignments by user
  const assignmentsByUser = users
    .filter((u) => uniqueUsers.has(u.uid))
    .map((u) => {
      const count = assignments.filter((a) => a.uid === u.uid).length;
      return { uid: u.uid, name: `${u.firstName} ${u.lastName}`, count };
    })
    .sort((a, b) => b.count - a.count); // optional: sort by count desc

  // 🕳️ Find any accounts not present in assignments
  const assignedAccountNums = new Set(assignments.map((a) => a.accountNumber));

  // 🕳️ Compute unassigned accounts based on current filters and role type
  // 🕳️ Compute unassigned accounts correctly for both sales & supervisor modes
  const unassignedAccounts = filteredAccounts.filter((acc) => {
    const routeNums = acc.salesRouteNums || [];

    // Case 1️⃣: No route numbers at all
    if (routeNums.length === 0) return true;

    if (assigneeType === "sales") {
      // 🔹 Look for any active user whose route matches
      const hasRep = users.some(
        (u) => u.salesRouteNum && routeNums.includes(u.salesRouteNum)
      );
      return !hasRep;
    }

    if (assigneeType === "supervisor") {
      // 🔹 Step 1: Find reps who sell this account
      const reps = users.filter(
        (u) => u.salesRouteNum && routeNums.includes(u.salesRouteNum)
      );

      // 🔹 Step 2: Find supervisors of those reps
      const supervisorUids = new Set(
        reps.map((r) => r.reportsTo).filter(Boolean) as string[]
      );

      // 🔹 Step 3: Also include supervisors who personally sell this route
      users.forEach((u) => {
        if (
          u.role === "supervisor" &&
          u.salesRouteNum &&
          routeNums.includes(u.salesRouteNum)
        ) {
          supervisorUids.add(u.uid);
        }
      });

      // 🔹 Step 4: Does at least one of those supervisors exist in our user list?
      const hasSupervisor =
        supervisorUids.size > 0 && users.some((u) => supervisorUids.has(u.uid));

      return !hasSupervisor;
    }

    return false;
  });

  const rows = assignments.map((a) => {
    const account = accounts.find(
      (acc) => acc.accountNumber === a.accountNumber
    );
    const user = users.find((u) => u.uid === a.uid);
    return {
      id: `${a.accountNumber}-${a.uid}`,
      accountNumber: a.accountNumber,
      accountName: account?.accountName || a.accountNumber,
      address: account?.accountAddress || "",
      cityState:
        account?.city && account?.state
          ? `${account.city}, ${account.state}`
          : "",
      userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
      userId: user?.uid || a.uid,
    };
  });

  return (
    <Box className="assignments-preview" mt={2}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography variant="subtitle1">
          Assignments Preview ({assignments.length})
        </Typography>

        {onClearAll && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={onClearAll}
            sx={{ textTransform: "none" }}
          >
            Clear All
          </Button>
        )}
      </Box>

      <Typography
        variant="caption"
        color="textSecondary"
        display="block"
        mb={1}
      >
        {`${uniqueAccounts.size} accounts, ${uniqueUsers.size} users assigned`}
      </Typography>
      <TextField
        size="small"
        label="Search Accounts"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 1 }}
      />
      {assignmentsByUser.length > 0 && (
        <Box className="assignments-summary-list" mb={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            {assignmentsByUser.length} user
            {assignmentsByUser.length !== 1 ? "s" : ""} assigned:
          </Typography>

          <div className="assignments-user-grid">
            {assignmentsByUser.map((u) => (
              <div key={u.uid} className="assignments-user-card">
                <div className="user-header">
                  <span className="user-name">{u.name}</span>
                  <span className="user-count">
                    {u.count} {u.count === 1 ? "account" : "accounts"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      {unassignedAccounts.length > 0 && (
        <div className="unassigned-accounts-card">
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="subtitle2" fontWeight={600} color="error">
              ⚠️ {unassignedAccounts.length} account
              {unassignedAccounts.length !== 1 ? "s" : ""} have no assigned user
            </Typography>

            <Button
              variant="text"
              size="small"
              onClick={() => setShowUnassigned((v) => !v)}
            >
              {showUnassigned ? "Hide" : "View"} Details
            </Button>
          </Box>

          {showUnassigned && (
            <div className="unassigned-scroll">
              {unassignedAccounts.map((a) => (
                <div key={a.accountNumber} className="unassigned-item">
                  <span className="unassigned-name">{a.accountName}</span>
                  <span className="unassigned-number">#{a.accountNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Box className="assignments-table-wrapper">
        <TableVirtuoso
          data={rows.filter((r) =>
            r.accountName.toLowerCase().includes(searchTerm.toLowerCase())
          )}
          fixedHeaderContent={() => (
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Salesperson</TableCell>
              <TableCell align="right">Remove</TableCell>
            </TableRow>
          )}
          itemContent={(_, r) => (
            <>
              <TableCell>
                <strong>{r.accountName}</strong>
              </TableCell>
              <TableCell>{r.address}</TableCell>
              <TableCell>{r.userName}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onRemoveAssignment(r.accountNumber, r.userId)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </>
          )}
        />
      </Box>
    </Box>
  );
};

export default AssignmentsPreview;
