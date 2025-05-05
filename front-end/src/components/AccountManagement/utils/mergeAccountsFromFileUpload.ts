import * as XLSX from "xlsx";
import { CompanyAccountType } from "../../../utils/types";
import { normalizeCustomerType } from "./accountsHelper";

type AccountUpdateFields = Partial<Pick<
  CompanyAccountType,
  "accountName" | "accountAddress" | "typeOfAccount" | "chain" | "chainType" | "salesRouteNums"
>>;

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

      const updatesMap = new Map<string, AccountUpdateFields>();

      rows.forEach((row) => {
        const accountNumber = String(row.accountNumber).trim();
        if (!accountNumber) return;

        const current = updatesMap.get(accountNumber) || {};

        const newUpdate: AccountUpdateFields = {
          accountName: row.accountName?.trim(),
          accountAddress: row.accountAddress?.trim(),
          typeOfAccount: row.typeOfAccount ? normalizeCustomerType(row.typeOfAccount) : undefined,
          chain: row.chain?.trim(),
          chainType: row.chainType?.toLowerCase() === "independent" ? "independent" : "chain",
        };

        if (row.salesRouteNums) {
          const routes = String(row.salesRouteNums)
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);
          newUpdate.salesRouteNums = Array.from(
            new Set([...(current.salesRouteNums || []), ...routes])
          );
        }

        updatesMap.set(accountNumber, { ...current, ...newUpdate });
      });

      const changedAccounts: CompanyAccountType[] = [];
      const mergedAccounts: CompanyAccountType[] = [];

      const existingMap = new Map(existingAccounts.map((acc) => [acc.accountNumber, acc]));

      existingAccounts.forEach((acc) => {
        const update = updatesMap.get(acc.accountNumber);
        if (!update) {
          mergedAccounts.push(acc);
        } else {
          const updated: CompanyAccountType = {
            ...acc,
            ...update,
            salesRouteNums: Array.from(
              new Set([...(acc.salesRouteNums || []), ...(update.salesRouteNums || [])])
            ),
          };

          mergedAccounts.push(updated);

          // Compare with original to detect change
          const changed =
            JSON.stringify(acc) !== JSON.stringify(updated);
          if (changed) changedAccounts.push(updated);
        }
      });

      // Add new accounts
      updatesMap.forEach((update, accNum) => {
        if (!existingMap.has(accNum)) {
          const newAccount: CompanyAccountType = {
            accountNumber: accNum,
            accountName: update.accountName ?? "",
            accountAddress: update.accountAddress ?? "",
            salesRouteNums: (update.salesRouteNums || []).map(String),
            typeOfAccount: update.typeOfAccount ?? "", // Type '""' is not assignable to type 'customerType | undefined'.
            chain: update.chain ?? "",
            chainType: update.chainType ?? "independent",
          };
          
          
          mergedAccounts.push(newAccount);
          changedAccounts.push(newAccount);
        }
      });

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

