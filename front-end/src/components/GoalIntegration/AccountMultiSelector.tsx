import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Select,
  MenuItem,
} from "@mui/material";
import { CompanyAccountType, UserType } from "../../utils/types";
import "./accountMultiSelector.css";

interface GoalAssignment {
  accountNumber: string;
  uid: string;
}

interface AccountMultiSelectorProps {
  allAccounts: CompanyAccountType[];
  selectedAccounts: CompanyAccountType[];
  setSelectedAccounts: (updatedAccounts: CompanyAccountType[]) => void;
  companyUsers?: UserType[];
  itemsPerPage?: number;
  selectedAssignments: GoalAssignment[];
  setSelectedAssignments: (a: GoalAssignment[]) => void;
  disabledAccountNumbers?: string[];
}

const AccountMultiSelector: React.FC<AccountMultiSelectorProps> = ({
  allAccounts,
  selectedAccounts,
  setSelectedAccounts,
  companyUsers = [],
  itemsPerPage = 20,
  selectedAssignments,
  setSelectedAssignments,
  disabledAccountNumbers = [],
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // 🧭 Scroll to top whenever page changes
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const normalize = (val: any) =>
    String(val ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
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

  // 🔸 No default auto-select behavior — leave all unselected initially
  useEffect(() => {
    if (selectedAccounts.length > 0 && allAccounts.length === 0) {
      setSelectedAccounts([]);
      setSelectedAssignments([]);
    }
  }, [allAccounts]);

  const handleAccountToggle = (account: CompanyAccountType) => {
    const isSelected = selectedAccounts.some(
      (a) => String(a.accountNumber) === String(account.accountNumber)
    );

    if (isSelected) {
      // 🔹 Deselection: remove account + its assignments
      const updatedAccounts = selectedAccounts.filter(
        (a) => a.accountNumber !== account.accountNumber
      );
      const updatedAssignments = selectedAssignments.filter(
        (g) => g.accountNumber !== account.accountNumber.toString()
      );
      setSelectedAccounts(updatedAccounts);
      setSelectedAssignments(updatedAssignments);
    } else {
      // 🔹 Add account: select all valid sales reps automatically
      const validReps = companyUsers?.filter(
        (u) =>
          u.salesRouteNum && account.salesRouteNums?.includes(u.salesRouteNum)
      );
      const newAssignments: GoalAssignment[] = validReps.map((u) => ({
        uid: u.uid,
        accountNumber: account.accountNumber.toString(),
      }));

      setSelectedAccounts([...selectedAccounts, account]);

      // Merge with existing assignments, removing duplicates for that account
      const updatedAssignments = [
        ...selectedAssignments.filter(
          (g) => g.accountNumber !== account.accountNumber.toString()
        ),
        ...newAssignments,
      ];
      setSelectedAssignments(updatedAssignments);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newAccounts = filteredAccounts.filter(
        (acc) =>
          !selectedAccounts.some(
            (sel) => sel.accountNumber === acc.accountNumber
          )
      );
      setSelectedAccounts([...selectedAccounts, ...newAccounts]);

      // auto-assign all reps for these newly added accounts
      const autoAssignments: GoalAssignment[] = newAccounts.flatMap((acc) => {
        const reps = companyUsers.filter(
          (u) =>
            u.salesRouteNum && acc.salesRouteNums?.includes(u.salesRouteNum)
        );
        return reps.map((u) => ({
          uid: u.uid,
          accountNumber: acc.accountNumber.toString(),
        }));
      });

      const merged = [
        ...selectedAssignments,
        ...autoAssignments.filter(
          (a) =>
            !selectedAssignments.some(
              (prev) =>
                prev.uid === a.uid && prev.accountNumber === a.accountNumber
            )
        ),
      ];
      setSelectedAssignments(merged);
    } else {
      const filteredIds = filteredAccounts.map((a) => a.accountNumber);
      setSelectedAccounts(
        selectedAccounts.filter(
          (acc) => !filteredIds.includes(acc.accountNumber)
        )
      );
      setSelectedAssignments(
        selectedAssignments.filter(
          (a) => !filteredIds.includes(a.accountNumber)
        )
      );
    }
  };

  // 🔹 Helper: resolve supervisor names for each account
  const getSupervisorNames = (account: CompanyAccountType): string => {
    if (!companyUsers.length) return "-";
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
      {selectedAccounts.length === 0 && (
        <Typography
          variant="caption"
          sx={{ px: 2, py: 1, color: "text.secondary" }}
        >
          No accounts selected yet — use checkboxes to choose stores.
        </Typography>
      )}

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
        ref={listRef} // ✅ attach ref here
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
              <TableCell>Supervisor(s)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAccounts.map((account) => (
              <TableRow key={account.accountNumber}>
                <TableCell>
                  <Checkbox
                    disabled={disabledAccountNumbers?.includes(
                      account.accountNumber.toString()
                    )}
                    checked={selectedAccounts.some(
                      (a) => a.accountNumber === account.accountNumber
                    )}
                    onChange={() => handleAccountToggle(account)}
                  />
                </TableCell>
                <TableCell>{account.accountName}</TableCell>
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
