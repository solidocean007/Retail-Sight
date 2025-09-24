// AccountMultiSelector.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Typography,
  Button,
} from "@mui/material";
import { CompanyAccountType, UserType } from "../../utils/types";
import "./accountMultiSelector.css";

interface AccountMultiSelectorProps {
  allAccounts: CompanyAccountType[];
  selectedAccounts: CompanyAccountType[];
  setSelectedAccounts: (updatedAccounts: CompanyAccountType[]) => void;
  companyUsers?: UserType[] | null; // 🔹 to resolve supervisor names
  itemsPerPage?: number;
}

const AccountMultiSelector: React.FC<AccountMultiSelectorProps> = ({
  allAccounts,
  selectedAccounts,
  setSelectedAccounts,
  companyUsers,
  itemsPerPage = 20,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  const normalize = (val: any) =>
    String(val ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // strip punctuation, keep spaces
      .replace(/\s+/g, " ") // collapse spaces
      .trim();

  const filteredAccounts = useMemo(() => {
    const q = normalize(searchTerm);

    return allAccounts.filter((a) => {
      const searchable = normalize(
        [
          a.accountNumber,
          a.accountName,
          a.accountAddress,
          a.streetAddress,
          a.city,
          a.state,
          a.typeOfAccount,
          a.chain,
          a.chainType,
          (a.salesRouteNums || []).join(" "),
        ].join(" ")
      );

      // If no query, pass; else every query word must appear somewhere
      return !q || q.split(" ").every((token) => searchable.includes(token));
    });
  }, [allAccounts, searchTerm]);

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

  useEffect(() => {
    // If nothing is selected yet, default to selecting all accounts
    if (allAccounts.length > 0 && selectedAccounts.length === 0) {
      setSelectedAccounts(allAccounts);
    }
  }, [allAccounts, selectedAccounts, setSelectedAccounts]);

  const handleAccountToggle = (account: CompanyAccountType) => {
    const isSelected = selectedAccounts.some(
      (a) => String(a.accountNumber) === String(account.accountNumber)
    );
    setSelectedAccounts(
      isSelected
        ? selectedAccounts.filter(
            (a) => String(a.accountNumber) !== String(account.accountNumber)
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

  // 🔹 Helper: resolve supervisor names for each account
  const getSupervisorNames = (account: CompanyAccountType): string => {
    if (!companyUsers) return "-";
    const reps = companyUsers.filter(
      (u) =>
        u.salesRouteNum && account.salesRouteNums?.includes(u.salesRouteNum)
    );
    const supIds = Array.from(
      new Set(reps.map((r) => r.reportsTo).filter(Boolean))
    );
    const supNames = supIds.map((id) => {
      const sup = companyUsers.find((u) => u.uid === id);
      return sup ? `${sup.firstName} ${sup.lastName}` : "Unknown";
    });
    return supNames.length ? supNames.join(", ") : "-";
  };

  return (
    <Box className="account-multi-selector">
      <Box
        sx={{ px: 2, py: 1, borderBottom: "1px solid #eee", maxWidth: "500px" }}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search accounts..."
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
              <TableCell>Supervisor(s)</TableCell> {/* 🔹 New column */}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAccounts.map((account) => (
              <TableRow key={account.accountNumber}>
                <TableCell>
                  <Checkbox
                    checked={selectedAccounts.some(
                      (a) =>
                        String(a.accountNumber) ===
                        String(account.accountNumber)
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
                <TableCell>{getSupervisorNames(account)}</TableCell>
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
