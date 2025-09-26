import * as XLSX from "xlsx";
import { CompanyAccountType } from "../../../utils/types";

// Fields that can be updated
export type AccountUpdateFields = Partial<
  Pick<
    CompanyAccountType,
    | "accountName"
    | "accountAddress"
    | "streetAddress"
    | "city"
    | "state"
    | "typeOfAccount"
    | "chain"
    | "chainType"
    | "salesRouteNums"
  >
>;

export const parseAccountsFromFile = (
  file: File
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

          const existing = map.get(accountNumber);

          const currentSalesRoutes = row.salesRouteNums
            ? String(row.salesRouteNums)
                .split(",")
                .map((r) => r.trim())
                .filter(Boolean)
            : [];

          const mergedSalesRoutes = Array.from(
            new Set([
              ...(existing?.salesRouteNums || []),
              ...currentSalesRoutes,
            ])
          );

          const update: AccountUpdateFields = {
            accountName: row.accountName?.trim() || existing?.accountName,
            accountAddress:
              row.accountAddress?.trim() || existing?.accountAddress,
            streetAddress: row.streetAddress?.trim() || existing?.streetAddress,
            city: row.city?.trim() || existing?.city,
            state: row.state?.trim() || existing?.state,
            typeOfAccount: row.typeOfAccount
              ? row.typeOfAccount
              : existing?.typeOfAccount,
            chain: row.chain?.trim() || existing?.chain,
            chainType:
              row.chainType?.toLowerCase() === "independent"
                ? "independent"
                : row.chainType
                ? "chain"
                : existing?.chainType,
            salesRouteNums: mergedSalesRoutes,
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

export type AccountDiff = {
  accountNumber: string;
  fieldsChanged: string[];
  old: CompanyAccountType;
  updated: CompanyAccountType;
};

export const getAccountsForAdd = async (
  file: File
): Promise<CompanyAccountType[]> => {
  const raw = await parseAccountsFromFile(file);
  return Object.entries(raw).map(([accNum, fields]) => ({
    accountNumber: accNum,
    accountName: fields.accountName ?? "",
    accountAddress: fields.accountAddress ?? "",
    streetAddress: fields.streetAddress ?? "",
    city: fields.city ?? "",
    state: fields.state ?? "",
    typeOfAccount: fields.typeOfAccount,
    chain: fields.chain ?? "",
    chainType: fields.chainType ?? "independent",
    salesRouteNums: (fields.salesRouteNums || []).map(String),
  }));
};


export const getAccountsForUpdate = async (
  file: File,
  existingAccounts: CompanyAccountType[]
): Promise<CompanyAccountType[]> => {
  const parsed = await parseAccountsFromFile(file); // { [accountNumber]: AccountUpdateFields }

  const existingMap = new Map(existingAccounts.map(a => [a.accountNumber, a]));
  const updates: CompanyAccountType[] = [];

  for (const [accNum, incoming] of Object.entries(parsed)) {
    const existing = existingMap.get(accNum);
    if (!existing) continue;

    let hasChanges = false;
    const updated: CompanyAccountType = { ...existing };

    (Object.keys(incoming) as (keyof AccountUpdateFields)[]).forEach((key) => {
      const newValue = incoming[key];
      const oldValue = existing[key];

      // Normalize salesRouteNums to arrays of strings
      const normalizedNew =
        key === "salesRouteNums" && Array.isArray(newValue)
          ? newValue.map(String)
          : newValue;

      const normalizedOld =
        key === "salesRouteNums" && Array.isArray(oldValue)
          ? oldValue.map(String)
          : oldValue;

      if (
        normalizedNew !== undefined &&
        JSON.stringify(normalizedNew) !== JSON.stringify(normalizedOld)
      ) {
        updated[key] = normalizedNew as any;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      updates.push(updated);
    }
  }

  return updates;
};

export type AccountChangeType = "new" | "update";

export type UnifiedAccountChange = {
  type: AccountChangeType;
  account: CompanyAccountType;
};

export const getAccountsForAddOrUpdate = async (
  file: File,
  existingAccounts: CompanyAccountType[]
): Promise<UnifiedAccountChange[]> => {
  const newAccounts = await getAccountsForAdd(file);
  const updatedAccounts = await getAccountsForUpdate(file, existingAccounts);

  return [
    ...newAccounts.map((a) => ({ type: "new" as const, account: a })),
    ...updatedAccounts.map((a) => ({ type: "update" as const, account: a })),
  ];
};



