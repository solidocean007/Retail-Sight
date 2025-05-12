// AccountMultiSelector.tsx
// AccountMultiSelector.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
  Pagination,
} from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import "./accountMultiSelector.css";

interface AccountMultiSelectorProps {
  allAccounts: CompanyAccountType[];
  selectedAccounts: CompanyAccountType[];
  setSelectedAccounts: React.Dispatch<
    React.SetStateAction<CompanyAccountType[]>
  >;
  itemsPerPage?: number;
}

const AccountMultiSelector: React.FC<AccountMultiSelectorProps> = ({
  allAccounts,
  selectedAccounts,
  setSelectedAccounts,
  itemsPerPage = 10,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredAccounts = allAccounts.filter(
    (account) =>
      account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber?.toString().includes(searchTerm),
  );

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleAccountSelection = (account: CompanyAccountType) => {
    const exists = selectedAccounts.some(
      (a) => a.accountNumber === account.accountNumber,
    );
    if (exists) {
      setSelectedAccounts(
        selectedAccounts.filter(
          (a) => a.accountNumber !== account.accountNumber,
        ),
      );
    } else {
      setSelectedAccounts([...selectedAccounts, account]);
    }
  };

  const handleSelectAll = () => {
    const allSelected = selectedAccounts.length === filteredAccounts.length;
    if (allSelected) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(filteredAccounts);
    }
  };

  return (
    <Box className="account-multi-selector">
      {selectedAccounts.length > 0 && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          {selectedAccounts.length} account
          {selectedAccounts.length > 1 ? "s" : ""} selected
        </Typography>
      )}

      <TextField
        label="Search accounts to add to goal"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        className="search-input"
      />

      <Box className="select-all-row">
        <Checkbox
          indeterminate={
            selectedAccounts.length > 0 &&
            selectedAccounts.length < filteredAccounts.length
          }
          checked={selectedAccounts.length === filteredAccounts.length}
          onChange={handleSelectAll}
        />
        <Typography>
          {selectedAccounts.length === filteredAccounts.length
            ? "Deselect All"
            : "Select All"}
        </Typography>
      </Box>

      <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
        <Table className="account-table">
          <TableHead>
            <TableRow>
              <TableCell>Select</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Route #</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Chain</TableCell>
              <TableCell>Chain Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAccounts.map((account) => (
              <TableRow key={account.accountNumber}>
                <TableCell>
                  <Checkbox
                    checked={selectedAccounts.some(
                      (a) => a.accountNumber === account.accountNumber,
                    )}
                    onChange={() => handleAccountSelection(account)}
                  />
                </TableCell>
                <TableCell>{account.accountName || "-"}</TableCell>
                <TableCell>{account.accountAddress || "-"}</TableCell>
                <TableCell>
                  {(account.salesRouteNums || []).join(", ")}
                </TableCell>
                <TableCell>{account.typeOfAccount || "-"}</TableCell>
                <TableCell>{account.chain || "-"}</TableCell>
                <TableCell>{account.chainType || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Pagination
        count={Math.ceil(filteredAccounts.length / itemsPerPage)}
        page={currentPage}
        onChange={(_, page) => setCurrentPage(page)}
        className="pagination-control"
      />
    </Box>
  );
};

export default AccountMultiSelector;
