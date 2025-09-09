// utils/accountDiffUtils.ts

import { CompanyAccountType } from "../../../utils/types";
import { AccountUpdateFields } from "./splitAccountUpload";

export type UpdateMode = "replace"; // more modes later (like "merge") if needed

export type AccountDiff = {
  accountNumber: string;
  old: CompanyAccountType;
  incoming: AccountUpdateFields;
  fieldsChanged: (keyof AccountUpdateFields)[];
  routeNumChange?: {
    old: string[];
    new: string[];
    mode: UpdateMode;
  };
  updated: CompanyAccountType; // preview of final result
};

export function getAccountDiffs(
  parsed: Record<string, AccountUpdateFields>,
  existingAccounts: CompanyAccountType[]
): AccountDiff[] {
  const diffs: AccountDiff[] = [];

  const existingMap = new Map(
    existingAccounts.map((acc) => [acc.accountNumber, acc])
  );

  for (const [accNum, incoming] of Object.entries(parsed)) {
    const existing = existingMap.get(accNum);
    if (!existing) continue;

    const updated: CompanyAccountType = { ...existing };
    const fieldsChanged: (keyof AccountUpdateFields)[] = [];

    (Object.keys(incoming) as (keyof AccountUpdateFields)[]).forEach((key) => {
      const newVal = incoming[key];
      const oldVal = existing[key];

      const normNew =
        key === "salesRouteNums" && Array.isArray(newVal)
          ? newVal.map(String)
          : newVal;

      const normOld =
        key === "salesRouteNums" && Array.isArray(oldVal)
          ? oldVal.map(String)
          : oldVal;

      const isDifferent =
        normNew !== undefined &&
        JSON.stringify(normNew) !== JSON.stringify(normOld);

      if (isDifferent) {
        updated[key] = normNew as any;
        fieldsChanged.push(key);
      }
    });

    if (fieldsChanged.length > 0) {
      const routeNumChange =
        fieldsChanged.includes("salesRouteNums") &&
        Array.isArray(incoming.salesRouteNums)
          ? {
              old: existing.salesRouteNums || [],
              new: incoming.salesRouteNums,
              mode: "replace" as const,
            }
          : undefined;

      diffs.push({
        accountNumber: accNum,
        old: existing,
        incoming,
        fieldsChanged,
        routeNumChange,
        updated,
      });
    }
  }

  return diffs;
}
