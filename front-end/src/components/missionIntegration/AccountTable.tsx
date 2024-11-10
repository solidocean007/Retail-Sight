// AccountTable.tsx
import React from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from "@mui/material";
import { GalloAccountType } from "../../utils/types";

interface AccountTableProps {
  accounts: GalloAccountType[];
}

const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
  return (
    <TableContainer>
      <Typography variant="h6">Accounts</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Opp ID</TableCell>
            <TableCell>Market ID</TableCell>
            <TableCell>Goal ID</TableCell>
            <TableCell>Distributor Acct ID</TableCell>
            <TableCell>Gallo Acct ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.oppId}>
              <TableCell>{account.oppId}</TableCell>
              <TableCell>{account.marketId}</TableCell>
              <TableCell>{account.goalId}</TableCell>
              <TableCell>{account.distributorAcctId}</TableCell>
              <TableCell>{account.galloAcctId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AccountTable;
