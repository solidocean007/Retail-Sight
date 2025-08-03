// AccountMultiSelector.tsx
import React, { useState } from "react";
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
  Button,
  InputBase,
} from "@mui/material";
import { CompanyAccountType } from "../../utils/types";
import "./accountMultiSelector.css";

interface AccountMultiSelectorProps {
  allAccounts: CompanyAccountType[];
  selectedAccounts: CompanyAccountType[];
  setSelectedAccounts: (updatedAccounts: CompanyAccountType[]) => void;
  itemsPerPage?: number;
}

const AccountMultiSelector: React.FC<AccountMultiSelectorProps> = ({
  allAccounts,
  selectedAccounts,
  setSelectedAccounts,
  itemsPerPage = 20,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  const filteredAccounts = allAccounts.filter(
    (account) =>
      account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber?.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const paginatedAccounts = filteredAccounts.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  const allFilteredSelected = filteredAccounts.every((acc) =>
    selectedAccounts.some((sel) => sel.accountNumber === acc.accountNumber)
  );

  const someFilteredSelected =
    filteredAccounts.some((acc) =>
      selectedAccounts.some((sel) => sel.accountNumber === acc.accountNumber)
    ) && !allFilteredSelected;

  const handleAccountToggle = (account: CompanyAccountType) => {
    const isSelected = selectedAccounts.some(
      (a) => a.accountNumber === account.accountNumber
    );
    setSelectedAccounts(
      isSelected
        ? selectedAccounts.filter(
            (a) => a.accountNumber !== account.accountNumber
          )
        : [...selectedAccounts, account]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const toAdd = filteredAccounts.filter(
        (acc) =>
          !selectedAccounts.some(
            (sel) => sel.accountNumber === acc.accountNumber
          )
      );
      setSelectedAccounts([...selectedAccounts, ...toAdd]);
    } else {
      const filteredIds = filteredAccounts.map((a) => a.accountNumber);
      setSelectedAccounts(
        selectedAccounts.filter(
          (acc) => !filteredIds.includes(acc.accountNumber)
        )
      );
    }
  };

  return (
    <Box className="account-multi-selector">
      {/* Top Controls */}
      <Box
        sx={{ px: 2, py: 1, borderBottom: "1px solid #eee", maxWidth: "500px" }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search accounts to add to goal"
          className="account-search-input"
        />

        <Box display="flex" alignItems="center" mt={1}>
          <Checkbox
            indeterminate={someFilteredSelected}
            checked={allFilteredSelected}
            onChange={handleSelectAll}
          />
          <Typography variant="body2">
            {allFilteredSelected ? "Deselect All" : "Select All"}
          </Typography>
        </Box>
      </Box>

      {/* Scrollable Table */}
      <Box
        sx={{
          maxHeight: 400,
          overflowY: "auto",
          borderTop: "1px solid #eee",
        }}
      >
        <Table stickyHeader size="small">
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
                      (a) => a.accountNumber === account.accountNumber
                    )}
                    onChange={() => handleAccountToggle(account)}
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

      {/* Pagination */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 1,
          borderTop: "1px solid #eee",
        }}
      >
        <Button
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
        >
          ◀
        </Button>
        <Typography sx={{ mx: 2 }}>
          Page {currentPage + 1} of {totalPages}
        </Typography>
        <Button
          onClick={() =>
            setCurrentPage((p) => (p + 1 < totalPages ? p + 1 : totalPages - 1))
          }
          disabled={currentPage + 1 >= totalPages}
        >
          ▶
        </Button>
      </Box>
    </Box>
  );
};

export default AccountMultiSelector;
