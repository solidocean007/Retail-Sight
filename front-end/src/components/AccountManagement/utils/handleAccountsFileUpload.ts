import * as XLSX from "xlsx";
import { CompanyAccountType, customerType } from "../../../utils/types";
import { normalizeCustomerType } from "./accountsHelper";

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

    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    const accounts: CompanyAccountType[] = [];
    let currentAccount: CompanyAccountType | null = null;

    rows.forEach((row) => {
      const [
        customerNumRaw,
        customerName,
        addressRaw,
        customerTypeRaw,
        chain,
        chainType
      ] = row;

      const customerNum = String(customerNumRaw).trim();

      if (customerName) {
        // Store the previous account if valid
        if (currentAccount && currentAccount.salesRouteNums.length > 0) {
          accounts.push(currentAccount);
        }

        // Start a new account
        currentAccount = {
          accountNumber: customerNum,
          accountName: String(customerName).trim(),
          accountAddress: String(addressRaw).trim(),
          salesRouteNums: [],
          typeOfAccount: normalizeCustomerType(String(customerTypeRaw)),
          chain: String(chain).trim() || undefined,
          chainType: String(chainType).toLowerCase().trim() === "independent"
            ? "independent"
            : "chain"
        };
      } else if (
        currentAccount &&
        !isNaN(Number(customerNum)) &&
        Number(customerNum) > 0
      ) {
        const route = String(customerNum);
        if (!currentAccount.salesRouteNums.includes(route)) {
          currentAccount.salesRouteNums.push(route);
        }
      }
    });

    // Push the final account
    if (currentAccount && currentAccount.salesRouteNums.length > 0) { // Property 'salesRouteNums' does not exist on type 'never'.
      accounts.push(currentAccount);
    }

    onFinish(accounts);
  };

  reader.readAsArrayBuffer(file);
};
