import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
} from "@mui/material";
import { CompanyAccountType } from "../utils/types";
import "./userAccountsTable.css"

interface Props {
  accounts: CompanyAccountType[];
}

const UserAccountsTable: React.FC<Props> = ({ accounts }) => {
  return (
    <div className="accounts-table-wrapper">
      <table className="accounts-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Account #</th>
            <th>City</th>
            <th>State</th>
            <th>Chain</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.accountNumber}>
              <td>{acc.accountName}</td>
              <td>{acc.accountNumber}</td>
              <td>{acc.city}</td>
              <td>{acc.state}</td>
              <td>{acc.chain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserAccountsTable;
