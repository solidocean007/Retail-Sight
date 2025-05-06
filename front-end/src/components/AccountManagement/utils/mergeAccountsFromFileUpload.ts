import * as XLSX from "xlsx";
import { CompanyAccountType } from "../../../utils/types";
import { normalizeCustomerType } from "./accountsHelper";

type AccountUpdateFields = Partial<
  Pick<
    CompanyAccountType,
    | "accountName"
    | "accountAddress"
    | "typeOfAccount"
    | "chain"
    | "chainType"
    | "salesRouteNums"
  >
>;

const REQUIRED_HEADERS = [
  "accountNumber",
  "accountName",
  "accountAddress",
  "salesRouteNums",
  "typeOfAccount",
  "chain",
  "chainType",
];

interface MergeResult {
  mergedAccounts: CompanyAccountType[];
  changedAccounts: CompanyAccountType[];
}

export const mergeAccountsFromFileUpload = (
  file: File,
  existingAccounts: CompanyAccountType[],
  onFinish: (result: MergeResult) => void,
  onError?: (error: string) => void
) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: "",
        header: 0,
      });

      if (!rows.length) throw new Error("The uploaded file is empty.");

      const headers = Object.keys(rows[0]).map((h) => h.trim());
      const missing = REQUIRED_HEADERS.filter((req) => !headers.includes(req));
      if (missing.length > 0) {
        throw new Error(`Missing required header(s): ${missing.join(", ")}`);
      }

      const updatesMap = new Map<number, AccountUpdateFields>();

      rows.forEach((row) => {
        const accountNumber = Number(row.accountNumber);
        if (!accountNumber || isNaN(accountNumber)) return;

        const current = updatesMap.get(accountNumber) || {};

        const newUpdate: AccountUpdateFields = {
          accountName: row.accountName?.trim(),
          accountAddress: row.accountAddress?.trim(),
          typeOfAccount: row.typeOfAccount
            ? normalizeCustomerType(row.typeOfAccount)
            : undefined,
          chain: row.chain?.trim(),
          chainType:
            row.chainType?.toLowerCase() === "independent"
              ? "independent"
              : "chain",
        };

        if (row.salesRouteNums) {
          const routes = String(row.salesRouteNums)
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
            .map(String); // force as string
          newUpdate.salesRouteNums = Array.from(
            new Set([...(current.salesRouteNums || []), ...routes])
          );
        }

        updatesMap.set(accountNumber, { ...current, ...newUpdate });
      });

      const changedAccounts: CompanyAccountType[] = [];
      const mergedAccounts: CompanyAccountType[] = [];

      const existingMap = new Map<number, CompanyAccountType>(
        existingAccounts.map((acc) => [acc.accountNumber, acc])
      );

      existingAccounts.forEach((acc) => {
        const update = updatesMap.get(acc.accountNumber);
        if (!update) {
          mergedAccounts.push(acc);
        } else {
          const updated: CompanyAccountType = {
            ...acc,
            accountName:
              update.accountName && update.accountName.trim() !== ""
                ? update.accountName
                : acc.accountName,
            accountAddress:
              update.accountAddress && update.accountAddress.trim() !== ""
                ? update.accountAddress
                : acc.accountAddress,
            typeOfAccount: update.typeOfAccount ?? acc.typeOfAccount,
            chain:
              update.chain && update.chain.trim() !== ""
                ? update.chain
                : acc.chain,
            chainType: update.chainType ?? acc.chainType,
            salesRouteNums: Array.from(
              new Set([
                ...(acc.salesRouteNums || []),
                ...(update.salesRouteNums || []),
              ])
            ).map(String),
          };

          mergedAccounts.push(updated);

          // Only mark as changed if at least one field is different
          const changed = Object.entries(update).some(([key, val]) => {
            const existingVal = acc[key as keyof CompanyAccountType];
            if (Array.isArray(val)) {
              return JSON.stringify(val) !== JSON.stringify(existingVal || []);
            }
            return val !== existingVal;
          });
          if (changed) changedAccounts.push(updated);
        }
      });

      updatesMap.forEach((update, accNum) => {
        if (!existingMap.has(accNum)) {
          // Enforce required fields for new accounts
          if (!update.accountName || !update.accountAddress) {
            throw new Error(
              `Missing required fields for new account ${accNum}: name and address are required.`
            );
          }
      
          const newAccount: CompanyAccountType = {
            accountNumber: accNum,
            accountName: update.accountName,
            accountAddress: update.accountAddress,
            salesRouteNums: (update.salesRouteNums || []).map(String),
            typeOfAccount: update.typeOfAccount ?? "", 
            chain: update.chain ?? "",
            chainType: update.chainType ?? "independent",
          };
      
          mergedAccounts.push(newAccount);
          changedAccounts.push(newAccount);
        }
      });
      

      console.log("Changed accounts:", changedAccounts);
      console.log("Merged accounts total:", mergedAccounts.length);

      onFinish({
        mergedAccounts,
        changedAccounts,
      });
    } catch (err: any) {
      console.error("Error processing file:", err);
      if (onError) {
        onError(err.message || "Error reading file.");
      } else {
        alert(err.message || "Error reading file.");
      }
    }
  };

  reader.readAsArrayBuffer(file);
};
