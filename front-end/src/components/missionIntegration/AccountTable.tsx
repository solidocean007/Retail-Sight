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
import { EnrichedGalloAccountType } from "../../utils/types";

interface AccountTableProps {
  accounts: EnrichedGalloAccountType[];
}

const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
  return (
    <TableContainer>
      <Typography variant="h6">Accounts</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Account Name</TableCell>
            <TableCell>Account Address</TableCell>
            <TableCell>Sales Route #</TableCell>
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
              <TableCell>{account.accountName || "N/A"}</TableCell>
              <TableCell>{account.accountAddress || "N/A"}</TableCell>
              <TableCell>
                {Array.isArray(account.salesRouteNums) 
                  ? account.salesRouteNums.join(", ") 
                  : account.salesRouteNums || "N/A"}
              </TableCell>
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
