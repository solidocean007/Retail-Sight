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

  const handleSearchAccounts = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchAccounts(event.target.value);
  };

  // Handle sales route search
  const handleSearchRoute = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRoute(event.target.value);
  };

  const filteredAccounts = accounts.filter((account) => {
    // Skip accounts without a name
    if (!account.accountName) return false;

    // Check if account name matches search input
    const matchesAccountName = account.accountName
      .toLowerCase()
      .includes(searchAccounts.toLowerCase());

    // Check if sales route number matches search input
    const matchesRoute =
      searchRoute === "" ||
      (Array.isArray(account.salesRouteNums)
        ? account.salesRouteNums.some((num) =>
            (num as unknown as string)?.toString().includes(searchRoute)
          )
        : (
            (account.salesRouteNums as unknown as string)?.toString() || ""
          ).includes(searchRoute));

    return matchesAccountName && matchesRoute;
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
  

 

  return (
    <TableContainer component={Paper} className="account-table">
      <Typography
        variant="h6"
        className="account-title"
      >{`${selectedAccounts.length} Accounts Selected`}</Typography>
      <div className="account-actions">
        <Button variant="contained" color="secondary" onClick={handleSelectAll}>
          {isAllSelected ? "Deselect All" : "Select All"}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowConfirmDialog(true)} // Open confirmation dialog
          disabled={isSaving || selectedAccounts.length === 0}
        >
          {isSaving ? "Saving..." : "Save Goal"}
        </Button>
      </div>
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
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
            <TableCell>Account Name</TableCell>
            <TableCell>Account Address</TableCell>
            <TableCell>Sales Route #</TableCell>
            <TableCell>Opp ID</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAccounts.map((account) => (
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
              <TableCell>{account.oppId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
              setShowConfirmDialog(false); // Close dialog
              handleCreateGalloGoal(); // Call save function
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
