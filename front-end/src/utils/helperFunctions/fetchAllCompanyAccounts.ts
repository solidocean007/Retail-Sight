import { fetchAllAccountsFromFirestore } from "./fetchAllAccountsFromFirestore";
import getCompanyAccountId from "./getCompanyAccountId";

// this gets all of the accounts for the users company
export const fetchAllCompanyAccounts = async (
  companyId: string | undefined,
) => {
  // this gets all of the users companys accounts
  if (!companyId) {
    console.error("No company ID provided.");
    return [];
  }

  const accountsId = await getCompanyAccountId(companyId);
  if (!accountsId) {
    console.error("No accounts ID found for the company");
    return [];
  }

  const accounts = await fetchAllAccountsFromFirestore(accountsId);
  return accounts;
};
