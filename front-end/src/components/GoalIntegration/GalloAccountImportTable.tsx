import React, { useEffect, useState } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Checkbox,
  Button,
  Paper,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  EnrichedGalloAccountType,
  GalloGoalType,
  GalloProgramType,
} from "../../utils/types";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import "./galloAccountImportTable.css";
import { createGalloGoal } from "../../utils/helperFunctions/createGalloGoal";

interface AccountTableProps {
  accounts: EnrichedGalloAccountType[];
  selectedGoal: GalloGoalType | null; // Pass the selected goal from the parent
  selectedProgram: GalloProgramType | null; // Pass the selected program from the parent
  onSaveComplete: () => void;
}

const GalloAccountImportTable: React.FC<AccountTableProps> = ({
  accounts,
  selectedGoal,
  selectedProgram,
  onSaveComplete,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAccounts, setSelectedAccounts] =
    useState<EnrichedGalloAccountType[]>(accounts);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const [searchAccounts, setSearchAccounts] = useState("");
  const [searchRoute, setSearchRoute] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchSalesperson, setSearchSalesperson] = useState("");

  const handleSearchSalesperson = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearchSalesperson(event.target.value);
  };

  const handleSearchAccounts = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchAccounts(event.target.value);
  };

  // Handle sales route search
  const handleSearchRoute = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRoute(event.target.value);
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!account.accountName) return false;

    const matchesAccountName = account.accountName
      .toLowerCase()
      .includes(searchAccounts.toLowerCase());

    const matchesRoute =
      searchRoute === "" ||
      (Array.isArray(account.salesRouteNums)
        ? account.salesRouteNums.some((num) =>
            (num as unknown as string)?.toString().includes(searchRoute)
          )
        : ((account.salesRouteNums as unknown as string) ?? "").includes(
            searchRoute
          ));

    const matchesSalesperson =
      searchSalesperson === "" ||
      account.salesPersonsName
        ?.toLowerCase()
        .includes(searchSalesperson.toLowerCase());

    return matchesAccountName && matchesRoute && matchesSalesperson;
  });

  useEffect(() => {
    if (accounts.length === selectedAccounts.length) {
      setIsAllSelected(true);
    } else {
      setIsAllSelected(false);
    }
  }, [selectedAccounts, accounts]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts);
    }
  };

  const handleCheckboxChange = (account: EnrichedGalloAccountType) => {
    const isSelected = selectedAccounts.some(
      (selected) => selected.distributorAcctId === account.distributorAcctId
    );

    if (isSelected) {
      setSelectedAccounts(
        selectedAccounts.filter(
          (selected) => selected.distributorAcctId !== account.distributorAcctId
        )
      );
    } else {
      setSelectedAccounts([...selectedAccounts, account]);
    }
  };

  const handleCreateGalloGoal = async () => {
    if (!selectedGoal || !selectedProgram) {
      alert("Please select a goal and program before saving.");
      return;
    }

    setIsSaving(true); // Start saving
    try {
      await createGalloGoal(
        selectedGoal,
        selectedProgram,
        selectedAccounts,
        companyId || ""
      );
      alert("Goal saved successfully!");
      onSaveComplete(); // Notify parent component
    } catch (err) {
      alert("Failed to save the goal. Please try again.");
    } finally {
      setIsSaving(false); // End saving
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(filteredAccounts.length / rowsPerPage);

  const [selectedPage, setSelectedPage] = useState(1);
  const selectedPerPage = 10;

  const paginatedSelectedAccounts = selectedAccounts.slice(
    (selectedPage - 1) * selectedPerPage,
    selectedPage * selectedPerPage
  );

  const totalSelectedPages = Math.ceil(
    selectedAccounts.length / selectedPerPage
  );

  return (
    <TableContainer component={Paper} className="account-table">
      {/* Buttons */}
      <Box display="flex" justifyContent="flex-end" gap={2} mb={1}>
        <Button
          variant="outlined"
          onClick={() => setSelectedAccounts(accounts)}
        >
          Select All
        </Button>
        <Button variant="outlined" onClick={() => setSelectedAccounts([])}>
          Deselect All
        </Button>
        <Button
          onClick={() => {
            setShowConfirmDialog(true);
            // Save here
            // performSave();
          }}
          color="primary"
          variant="contained"
        >
          Confirm
        </Button>
      </Box>

      {/* Selected Accounts Summary */}
      <Box
        sx={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "8px",
          marginBottom: 2,
          // backgroundColor: "var(--background)",
        }}
      >
        <Typography variant="subtitle1" gutterBottom>
          {isAllSelected
            ? "All accounts selected"
            : `${selectedAccounts.length} account(s) selected:`}
        </Typography>

        {!isAllSelected && selectedAccounts.length > 0 && (
          <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
            {paginatedSelectedAccounts.map((acc) => (
              <Box
                key={acc.distributorAcctId}
                display="flex"
                alignItems="center"
                gap={1}
                sx={{
                  borderBottom: "1px solid #444",
                  paddingY: 0.5,
                }}
              >
                <Checkbox
                  size="small"
                  checked
                  onChange={() => handleCheckboxChange(acc)}
                />
                <Typography variant="body2" noWrap>
                  {acc.accountName} - {acc.salesPersonsName}
                </Typography>
              </Box>
            ))}

            {/* Pagination Controls */}
            {totalSelectedPages > 1 && (
              <Box display="flex" justifyContent="center" gap={2} mt={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedPage === 1}
                  onClick={() => setSelectedPage((prev) => prev - 1)}
                >
                  Previous
                </Button>
                <Typography variant="caption">
                  Page {selectedPage} of {totalSelectedPages}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedPage === totalSelectedPages}
                  onClick={() => setSelectedPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Search Filters */}
      <Box display="flex" gap={2} sx={{ marginY: 2 }}>
        <TextField
          label="Search Account Name"
          variant="outlined"
          fullWidth
          value={searchAccounts}
          onChange={handleSearchAccounts}
        />
        <TextField
          label="Search Sales Route #"
          variant="outlined"
          fullWidth
          value={searchRoute}
          onChange={handleSearchRoute}
        />
        <TextField
          label="Search Salesperson Name"
          variant="outlined"
          fullWidth
          value={searchSalesperson}
          onChange={handleSearchSalesperson}
        />
      </Box>

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Account Name</TableCell>
            <TableCell>Account Address</TableCell>
            <TableCell>Sales Route #</TableCell>
            <TableCell>Salesperson</TableCell>
            <TableCell>Opp ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedAccounts.map((account) => (
            <TableRow key={account.oppId}>
              <TableCell>
                <Checkbox
                  checked={selectedAccounts.some(
                    (selected) =>
                      selected.distributorAcctId === account.distributorAcctId
                  )}
                  onChange={() => handleCheckboxChange(account)}
                />
              </TableCell>
              <TableCell>{account.accountName || "N/A"}</TableCell>
              <TableCell>{account.accountAddress || "N/A"}</TableCell>
              <TableCell>
                {Array.isArray(account.salesRouteNums)
                  ? account.salesRouteNums.join(", ")
                  : account.salesRouteNums || "N/A"}
              </TableCell>
              <TableCell>{account.salesPersonsName}</TableCell>
              <TableCell>{account.oppId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <Box display="flex" justifyContent="center" gap={2} mt={2}>
        <Button
          variant="outlined"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Previous
        </Button>
        <Typography variant="body2">
          Page {currentPage} of{" "}
          {Math.ceil(filteredAccounts.length / rowsPerPage)}
        </Typography>
        <Button
          variant="outlined"
          disabled={
            currentPage === Math.ceil(filteredAccounts.length / rowsPerPage)
          }
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </Button>
      </Box>

      {/* Confirm Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          Confirm Goal Creation
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to save the following goal?
          </Typography>
          <Typography>
            <strong>Program:</strong> {selectedProgram?.programTitle || "N/A"}
          </Typography>
          <Typography>
            <strong>Goal:</strong> {selectedGoal?.goal || "N/A"}
          </Typography>
          <Typography>
            <strong>Accounts Selected:</strong> {selectedAccounts.length}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            color="secondary"
            variant="contained"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowConfirmDialog(false);
              handleCreateGalloGoal();
            }}
            color="primary"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
};

export default GalloAccountImportTable;
