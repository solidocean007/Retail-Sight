import React from "react";
import AssignmentsPreview from "./AssingmentsPreview";
import AccountMultiSelector from "./AccountMultiSelector";
import {
  CompanyAccountType,
  GoalAssignmentType,
  UserType,
} from "../../utils/types";
import "./goalAssignmentsSection.css";

interface Props {
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
  accountScope,
  goalAssignments,
  setGoalAssignments,
  accounts,
  filteredAccounts,
  companyUsers,
  assigneeType,
}) => {
  const uniqueAccountsCount = new Set(
    goalAssignments.map((g) => g.accountNumber)
  ).size;
  const uniqueUsersCount = new Set(goalAssignments.map((g) => g.uid)).size;

  const handleRemoveAssignment = (accountNumber: string, uid: string) => {
    setGoalAssignments((prev) =>
      prev.filter((g) => !(g.uid === uid && g.accountNumber === accountNumber))
    );
  };

  return (
    <div className="goal-assignments-section">
      {accountScope === "selected" && (
        <>
          {goalAssignments.length === 0 ? (
            <p className="goal-assignments-empty">
              Please select accounts from the table below
            </p>
          ) : (
            <h3 className="goal-assignments-title">Selected Accounts</h3>
          )}

          <p className="goal-assignments-summary">
            {uniqueAccountsCount} accounts, {uniqueUsersCount} users assigned
          </p>

          {goalAssignments.length > 0 && (
            <AssignmentsPreview
              assignments={goalAssignments}
              accounts={accounts}
              users={companyUsers}
              onRemoveAssignment={handleRemoveAssignment}
              onClearAll={() => setGoalAssignments([])}
              filteredAccounts={filteredAccounts} // ✅ now available
              assigneeType={assigneeType} // ✅ for dynamic logic
            />
          )}

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
                  : [{ accountNumber: acc.accountNumber.toString(), uid: "" }]
              );
              setGoalAssignments([...goalAssignments, ...newAssignments]);
            }}
            selectedAssignments={goalAssignments}
            setSelectedAssignments={setGoalAssignments}
            companyUsers={companyUsers}
          />
        </>
      )}
    </div>
  );
};

export default GoalAssignmentsSection;
