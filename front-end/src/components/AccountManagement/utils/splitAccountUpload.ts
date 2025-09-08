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
            accountAddress: row.accountAddress?.trim() || existing?.accountAddress,
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

type AccountDiff = {
  accountNumber: string;
  fieldsChanged: string[];
  old: CompanyAccountType;
  updated: CompanyAccountType;
};


export const getAccountsForAdd = async (
  file: File,
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

// export const getAccountsForUpdate = async (
//   file: File,
//   existingAccounts: CompanyAccountType[],
// ): Promise<CompanyAccountType[]> => {
//   const raw = await parseAccountsFromFile(file);
//   const map = new Map(existingAccounts.map((a) => [a.accountNumber, a]));
//   const updates: CompanyAccountType[] = [];

//   for (const [accNum, fields] of Object.entries(raw)) {
//     const existing = map.get(accNum);
//     if (!existing) continue;

//     updates.push({
//       ...existing,
//       ...Object.fromEntries(
//         Object.entries(fields).filter(([, v]) => v !== undefined),
//       ),
//       salesRouteNums: Array.from(
//         new Set([
//           ...(existing.salesRouteNums || []),
//           ...(fields.salesRouteNums || []),
//         ])
//       ),
//     });
//   }

//   return updates;
// };

export async function getAccountsForUpdate(file: File, existingAccounts: CompanyAccountType[]) {
  const uploaded = await parseAccountsFromFile(file);
  const existingMap = new Map(existingAccounts.map(a => [a.accountNumber, a]));
  const updates = [];

  for (let u of uploaded) { // 
    const current = existingMap.get(u.accountNumber);
    if (!current) continue;

    const changes = {};
    let changed = false;

    for (let key in u) {
      if (u[key] !== undefined && JSON.stringify(u[key]) !== JSON.stringify(current[key])) {
        changes[key] = u[key];
        changed = true;
      }
    }

    if (changed) {
      updates.push({ ...current, ...changes });
    }
  }

  return updates;
}

