import React, { useState } from "react";
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
} from "@mui/material";
import { EnrichedGalloAccountType, GoalType, ProgramType } from "../../utils/types";
import { doc, setDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";

interface AccountTableProps {
  accounts: EnrichedGalloAccountType[];
  selectedGoal: GoalType | null; // Pass the selected goal from the parent
  selectedProgram: ProgramType | null; // Pass the selected program from the parent
}

const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  selectedGoal,
  selectedProgram,
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<EnrichedGalloAccountType[]>(accounts);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
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

    try {
      const goalDocRef = doc(db, "GalloGoals", selectedGoal.goalId);
      await setDoc(
        goalDocRef,
        {
          companyId: companyId,
          programId: selectedProgram.programId,
          programTitle: selectedProgram.programTitle,
          programStartDate: selectedProgram.startDate,
          programEndDate: selectedProgram.endDate,
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
    } catch (err) {
      console.error("Error saving goal for accounts:", err);
    }
  };
  console.log(selectedGoal) // this logs undefined

  return (
    <TableContainer>
      <Typography variant="h6">{`${selectedAccounts.length} `}Accounts</Typography>
      <Typography variant="h6">{selectedGoal?.goal}</Typography>

      <Button
        variant="contained"
        color="primary"
        onClick={saveGoalForAccounts}
        disabled={selectedAccounts.length === 0}
      >
        Save Goal for Selected Accounts
      </Button>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Select</TableCell>
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

