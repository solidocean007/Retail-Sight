import React from "react";
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
} from "@mui/material";
import { CompanyAccountType, UserType, GoalAssignmentType } from "../../utils/types";
import CloseIcon from "@mui/icons-material/Close";
import "./AssignmentsPreview.css";

interface AssignmentsPreviewProps {
  assignments: GoalAssignmentType[];
  accounts: CompanyAccountType[];
  users: UserType[];
  onRemoveAssignment: (accountNumber: string, uid: string) => void;
  onClearAll?: () => void;
}

const AssignmentsPreview: React.FC<AssignmentsPreviewProps> = ({
  assignments,
  accounts,
  users,
  onRemoveAssignment,
  onClearAll,
}) => {
  if (!assignments.length) return null;

  const uniqueAccounts = new Set(assignments.map((a) => a.accountNumber));
  const uniqueUsers = new Set(assignments.map((a) => a.uid));

  const rows = assignments.map((a) => {
    const account = accounts.find((acc) => acc.accountNumber === a.accountNumber);
    const user = users.find((u) => u.uid === a.uid);
    return {
      id: `${a.accountNumber}-${a.uid}`,
      accountNumber: a.accountNumber,
      accountName: account?.accountName || a.accountNumber,
      address: account?.accountAddress || "",
      cityState: account?.city && account?.state ? `${account.city}, ${account.state}` : "",
      userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
      userId: user?.uid || a.uid,
    };
  });

  return (
    <Box className="assignments-preview" mt={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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

      <Typography variant="caption" color="textSecondary" display="block" mb={1}>
        {`${uniqueAccounts.size} accounts, ${uniqueUsers.size} users assigned`}
      </Typography>

      <Box className="assignments-table-wrapper">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Salesperson</TableCell>
              <TableCell align="right">Remove</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <strong>{r.accountName}</strong>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {r.address}
                  </Typography>
                  {r.cityState && (
                    <Typography variant="caption" color="textSecondary">
                      {r.cityState}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{r.userName}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      onRemoveAssignment(r.accountNumber, r.userId)
                    }
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default AssignmentsPreview;
