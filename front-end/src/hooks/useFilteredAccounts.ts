// hooks/useFilteredAccounts.ts
import { useMemo } from "react";
import { CompanyAccountType } from "../utils/types";

export interface FiltersShape {
  chains: string[];
  chainType: string;
  typeOfAccounts: string[];
  userIds: string[];
  supervisorIds: string[];
}

interface UseFilteredAccountsArgs {
  accounts: CompanyAccountType[];
  filters: FiltersShape;
  reportsToMap: Map<string, string>;
  userIdsByAccount: Record<string, string[]>;
}

export function useFilteredAccounts({
  accounts,
  filters,
  reportsToMap,
  userIdsByAccount,
}: UseFilteredAccountsArgs) {
  return useMemo(() => {
    return accounts.filter((a) => {
      // Chain
      if (
        filters.chains.length &&
        !filters.chains.some(
          (c) => c.toLowerCase() === (a.chain || "").toLowerCase()
        )
      ) {
        return false;
      }

      // Chain Type
      if (filters.chainType && a.chainType !== filters.chainType) {
        return false;
      }

      // Type of Account
      if (
        filters.typeOfAccounts.length &&
        !filters.typeOfAccounts.includes(a.typeOfAccount || "")
      ) {
        return false;
      }

      // Sales Reps
      if (filters.userIds.length) {
        const assignedReps = userIdsByAccount[a.accountNumber] || [];
        if (!assignedReps.some((id) => filters.userIds.includes(id))) {
          return false;
        }
      }

      // Supervisors
      if (filters.supervisorIds.length) {
        const reps = userIdsByAccount[a.accountNumber] || [];
        const hasSup = reps.some((repUid) => {
          const supUid = reportsToMap.get(repUid);
          return supUid && filters.supervisorIds.includes(supUid);
        });
        if (!hasSup) return false;
      }

      return true;
    });
  }, [
    accounts,
    filters.chains,
    filters.chainType,
    filters.typeOfAccounts,
    filters.userIds,
    filters.supervisorIds,
    userIdsByAccount,
    reportsToMap,
  ]);
}
