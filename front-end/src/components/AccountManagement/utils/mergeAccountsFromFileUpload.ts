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

export const mergeAccountsFromFileUpload = (
  file: File,
  existingAccounts: CompanyAccountType[],
  onFinish: (merged: CompanyAccountType[]) => void,
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

      const mergedAccounts = existingAccounts.map((acc) => {
        const update = updatesMap.get(acc.accountNumber);
        if (!update) return acc;
        return {
          ...acc,
          ...update,
          salesRouteNums: Array.from(
            new Set([...(acc.salesRouteNums || []), ...(update.salesRouteNums || [])])
          ),
        };
      });

      // Add new accounts if accountNumber not in existingAccounts
      updatesMap.forEach((update, accNum) => {
        if (!existingAccounts.find((a) => a.accountNumber === accNum)) {
          mergedAccounts.push({
            accountNumber: accNum,
            accountName: update.accountName || "",
            accountAddress: update.accountAddress || "",
            salesRouteNums: update.salesRouteNums || [],
            typeOfAccount: update.typeOfAccount,
            chain: update.chain || "",
            chainType: update.chainType || "independent",
          });
        }
      });

      onFinish(mergedAccounts);
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

