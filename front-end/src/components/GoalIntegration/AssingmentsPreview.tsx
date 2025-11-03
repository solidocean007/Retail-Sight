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
}

const AssignmentsPreview: React.FC<AssignmentsPreviewProps> = ({
  assignments,
  accounts,
  users,
  onRemoveAssignment,
  onClearAll,
}) => {
  if (!assignments.length) return null;
  const [searchTerm, setSearchTerm] = useState("");
  const uniqueAccounts = new Set(assignments.map((a) => a.accountNumber));
  const uniqueUsers = new Set(assignments.map((a) => a.uid));

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
