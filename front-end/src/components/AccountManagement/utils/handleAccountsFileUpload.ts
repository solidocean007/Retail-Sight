import * as XLSX from "xlsx";
import { CompanyAccountType } from "../../../utils/types";

export const handleAccountsFileUpload = (
  file: File,
  onFinish: (parsedAccounts: CompanyAccountType[]) => void
) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
      defval: "",
    });

    const accounts: CompanyAccountType[] = [];
    let currentAccount: CompanyAccountType | null = null; // ✅ key fix here

    rows.forEach((row) => {
      const customerNum = String(
        row["accountNumber"] || row["customerNumber"]
      ).trim();
      const customerName = row["accountName"]?.trim();
      const accountAddress = row["accountAddress"]?.trim();
      const typeOfAccount = row["typeOfAccount"]?.trim();
      const chain = row["chain"]?.trim();
      const chainType = row["chainType"]?.trim();
      const route = row["salesRouteNum"]?.trim();

      if (customerName) {
        if (currentAccount && currentAccount.salesRouteNums.length > 0) {
          accounts.push(currentAccount);
        }

        currentAccount = {
          accountNumber: customerNum,
          accountName: customerName,
          accountAddress,
          salesRouteNums: [],
          typeOfAccount,
          chain: chain || undefined,
          chainType:
            chainType?.toLowerCase() === "independent"
              ? "independent"
              : "chain",
        };
      }

      if (
        currentAccount &&
        route &&
        /^\d+$/.test(route) &&
        !currentAccount.salesRouteNums.includes(route)
      ) {
        currentAccount.salesRouteNums.push(route);
      }
    });

    if (
      currentAccount &&
      (currentAccount as CompanyAccountType).salesRouteNums &&
      (currentAccount as CompanyAccountType).salesRouteNums.length > 0
    ) {
      accounts.push(currentAccount);
    }

    onFinish(accounts);
  };

  reader.readAsArrayBuffer(file);
};
