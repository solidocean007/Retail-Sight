import { db } from "../firebase";
import { collection, doc, getDoc } from 'firebase/firestore';
import { CompanyAccountType, CompanyType } from "../types";

export async function fetchUsersAccounts(companyId: string, salesRouteNum: string | undefined): Promise<CompanyAccountType[]> {
  const companyRef = doc(collection(db, 'companies'), companyId);
  console.log('fetching accounts')
  try {
    const companySnap = await getDoc(companyRef);
    if (!companySnap.exists()) {
      console.error("Company not found");
      return [];
    }

    const companyDoc = companySnap.data() as CompanyType;
    const accountId = companyDoc.accountsId;

    if (!accountId) {
      console.error("Account ID is not available in the company document.");
      return [];
    }

    // Step 2: Fetch the account document using the retrieved accountId
    const accountsRef = doc(collection(db, 'accounts'), accountId);
    const accountSnap = await getDoc(accountsRef);

    if (!accountSnap.exists()) {
      console.error("Account document not found");
      return [];
    }

    // Step 3: Retrieve and filter accounts data
    const accountData = (accountSnap.data().accounts || []).map((account: CompanyAccountType) => ({
      ...account,
      accountNumber: account.accountNumber || "unknown", // Ensure accountNumber exists if necessary
      salesRouteNums: Array.isArray(account.salesRouteNums) 
        ? account.salesRouteNums 
        : [account.salesRouteNums].filter(Boolean) // Wrap as array if single value and filter out falsy values
    })) as CompanyAccountType[];

    console.log(accountData, ': All Accounts Data'); // Log all account data to verify before filtering

    const filteredAccounts = accountData.filter(account => {
      // Ensure salesRouteNums is treated as an array for consistency
      const routeNums = account.salesRouteNums.map(String); // Convert all route numbers to strings
      const userRouteNum = String(salesRouteNum); // Convert user route number to a string
    
      const isMatchingRoute = routeNums.includes(userRouteNum);
      return isMatchingRoute;
    });
    

    const uniqueAccounts = Array.from(new Map(filteredAccounts.map(account => [account.accountNumber, account])).values());

    console.log(uniqueAccounts, ': Filtered Unique Accounts'); // Log the final filtered accounts
    return uniqueAccounts;

  } catch (error) {
    console.error("Error fetching user accounts:", error);
    return [];
  }
}


