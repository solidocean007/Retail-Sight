// Split logic for better clarity
import * as XLSX from "xlsx";
import { CompanyAccountType } from "../../../utils/types";
// import { normalizeCustomerType } from "./accountsHelper";

// Fields that can be updated
export type AccountUpdateFields = Partial<
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

const parseAccountsFromFile = (
  file: File,
): Promise<Record<string, AccountUpdateFields>> => {
  return new Promise((resolve, reject) => {
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

        const map = new Map<string, AccountUpdateFields>();

        rows.forEach((row) => {
          const accountNumber = String(row.accountNumber).trim();
          if (!accountNumber) return;

          const update: AccountUpdateFields = {
            accountName: row.accountName?.trim() || undefined,
            accountAddress: row.accountAddress?.trim() || undefined,
            typeOfAccount: row.typeOfAccount
              ? // ? normalizeCustomerType(row.typeOfAccount)
                row.typeOfAccount
              : undefined,
            chain: row.chain?.trim() || undefined,
            chainType:
              row.chainType?.toLowerCase() === "independent"
                ? "independent"
                : row.chainType
                  ? "chain"
                  : undefined,
            salesRouteNums: row.salesRouteNums
              ? String(row.salesRouteNums)
                  .split(",")
                  .map((r) => r.trim())
                  .filter(Boolean)
              : undefined,
          };

          map.set(accountNumber, update);
        });

        resolve(Object.fromEntries(map));
      } catch (err: any) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });
};

export const getAccountsForAdd = async (
  file: File,
): Promise<CompanyAccountType[]> => {
  const raw = await parseAccountsFromFile(file);
  return Object.entries(raw).map(([accNum, fields]) => ({
    accountNumber: accNum,
    accountName: fields.accountName ?? "",
    accountAddress: fields.accountAddress ?? "",
    typeOfAccount: fields.typeOfAccount,
    chain: fields.chain ?? "",
    chainType: fields.chainType ?? "independent",
    salesRouteNums: (fields.salesRouteNums || []).map(String),
  }));
};

export const getAccountsForUpdate = async (
  file: File,
  existingAccounts: CompanyAccountType[],
): Promise<CompanyAccountType[]> => {
  const raw = await parseAccountsFromFile(file);
  const map = new Map(existingAccounts.map((a) => [a.accountNumber, a]));
  const updates: CompanyAccountType[] = [];

  for (const [accNum, fields] of Object.entries(raw)) {
    const existing = map.get(accNum);
    if (!existing) continue;

    updates.push({
      ...existing,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined),
      ),
      salesRouteNums: Array.from(
        new Set([
          ...(existing.salesRouteNums || []),
          ...(fields.salesRouteNums || []),
        ]),
      ),
    });
  }

  return updates;
};
