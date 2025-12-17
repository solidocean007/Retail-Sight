import React, { useState } from "react";
import AssignmentsPreview from "./AssignmentsPreview";
import AccountMultiSelector from "./AccountMultiSelector";
import {
  CompanyAccountType,
  GoalAssignmentType,
  UserType,
} from "../../utils/types";
import "./goalAssignmentsSection.css";
import { Typography } from "@mui/material";
import { read } from "fs";

interface Props {
  readyForCreation: boolean;
  accountScope: "all" | "selected";
  goalAssignments: GoalAssignmentType[];
  setGoalAssignments: React.Dispatch<
    React.SetStateAction<GoalAssignmentType[]>
  >;
  accounts: CompanyAccountType[];
  filteredAccounts: CompanyAccountType[];
  companyUsers: UserType[];
  assigneeType: "sales" | "supervisor";
}

const GoalAssignmentsSection: React.FC<Props> = ({
  readyForCreation,
  accountScope,
  goalAssignments,
  setGoalAssignments,
  accounts,
  filteredAccounts,
  companyUsers,
  assigneeType,
}) => {
  if (readyForCreation == false) return;
  const uniqueAccountsCount = new Set(
    goalAssignments.map((g) => g.accountNumber)
  ).size;
  const uniqueUsersCount = new Set(goalAssignments.map((g) => g.uid)).size;
  const [showAdvancedSelector, setShowAdvancedSelector] = useState(false);

  const handleRemoveAssignment = (accountNumber: string, uid: string) => { // unused?
    setGoalAssignments((prev) =>
      prev.filter((g) => !(g.uid === uid && g.accountNumber === accountNumber))
    );
  };

  return (
    <div className="goal-assignments-section">
      <>
        {goalAssignments.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            No accounts selected yet. Use the filters above to choose accounts.
          </Typography>
        ) : (
          <h3 className="goal-assignments-title">Selected Accounts</h3>
        )}

        <p className="goal-assignments-summary">
          {uniqueAccountsCount} accounts, {uniqueUsersCount} users assigned
        </p>

        {!!goalAssignments.length && readyForCreation && (
          <AssignmentsPreview
            assignments={goalAssignments}
            accounts={accounts}
            users={companyUsers}
            setGoalAssignments={setGoalAssignments}
            onClearAll={() => setGoalAssignments([])}
            filteredAccounts={filteredAccounts}
            assigneeType={assigneeType}
          />
        )}

        <div className="advanced-account-selector">
          <Typography variant="subtitle1" fontWeight={600}>
            Advanced Account Selector (optional)
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={1}>
            Adjust individual accounts included in this goal.
          </Typography>

          <button onClick={() => setShowAdvancedSelector((x) => !x)}>
            {showAdvancedSelector
              ? "Hide Advanced Selector"
              : "Show Advanced Selector"}
          </button>

          {showAdvancedSelector && (
            <AccountMultiSelector
              allAccounts={filteredAccounts}
              selectedAccounts={accounts.filter((acc) =>
                goalAssignments.some(
                  (g) => g.accountNumber === acc.accountNumber.toString()
                )
              )}
              setSelectedAccounts={(updated) => {
                const newAssignments = updated.flatMap((acc) =>
                  goalAssignments.some(
                    (g) => g.accountNumber === acc.accountNumber.toString()
                  )
                    ? []
                    : [
                        {
                          accountNumber: acc.accountNumber.toString(),
                          uid: "",
                        },
                      ]
                );
                setGoalAssignments([...goalAssignments, ...newAssignments]);
              }}
              selectedAssignments={goalAssignments}
              setSelectedAssignments={setGoalAssignments}
              companyUsers={companyUsers}
            />
          )}
        </div>
      </>
    </div>
  );
};

export default GoalAssignmentsSection;
