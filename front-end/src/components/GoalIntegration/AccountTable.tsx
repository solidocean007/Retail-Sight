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
} from "@mui/material";
import { EnrichedGalloAccountType, GalloGoalType, GalloProgramType } from "../../utils/types";
import { doc, setDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import './accountTable.css';

interface AccountTableProps {
  accounts: EnrichedGalloAccountType[];
  selectedGoal:GalloGoalType | null; // Pass the selected goal from the parent
  selectedProgram: GalloProgramType | null; // Pass the selected program from the parent
  onSaveComplete:  () => void;
}

const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  selectedGoal,
  selectedProgram,
  onSaveComplete,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<EnrichedGalloAccountType[]>(accounts);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

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

  const saveGoalForAccounts = async () => {
    if (!selectedGoal || !selectedProgram) {
      console.error("Selected goal or program is missing.");
      return;
    }
    setIsSaving(true);
    try {
      const goalDocRef = doc(db, "GalloGoals", selectedGoal.goalId);
      await setDoc(
        goalDocRef,
        {
          companyId: companyId,
          programDetails: {
            programId: selectedProgram.programId,
            programTitle: selectedProgram.programTitle,
            programStartDate: selectedProgram.startDate,
            programEndDate: selectedProgram.endDate
          }
         ,
          goalDetails: {
            goalId: selectedGoal.goalId,
            goal: selectedGoal.goal,
            goalMetric: selectedGoal.goalMetric,
            goalValueMin: selectedGoal.goalValueMin,
          },
          accounts: selectedAccounts.map((account) => ({
            distributorAcctId: account.distributorAcctId,
            accountName: account.accountName,
            accountAddress: account.accountAddress,
            salesRouteNums: account.salesRouteNums,
            oppId: account.oppId,
            marketId: account.marketId,
          })),
        },
        { merge: true }
      );
      console.log("Goal saved successfully for selected accounts!");
      onSaveComplete();
    } catch (err) {
      console.error("Error saving goal for accounts:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TableContainer component={Paper} className="account-table">
      <Typography variant="h6" className="account-title">{`${selectedAccounts.length} Accounts Selected`}</Typography>
      <div className="account-actions">
        <Button variant="contained" color="secondary" onClick={handleSelectAll}>
          {isAllSelected ? "Deselect All" : "Select All"}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={saveGoalForAccounts}
          disabled={isSaving || selectedAccounts.length === 0}
        >
          {isSaving ? "Saving..." : "Save Goal"}
        </Button>
      </div>
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
          {accounts.map((account) => (
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
    </TableContainer>
  );
};

export default AccountTable;

