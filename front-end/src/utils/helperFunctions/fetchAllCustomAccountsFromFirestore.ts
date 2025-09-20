import { doc, getDoc } from "firebase/firestore";
import { CompanyAccountType } from "../types";
import { db } from "../firebase";

// Fetch all accounts from Firestore
export async function fetchAllCustomAccountsFromFirestore(
  companyDocId: string,
): Promise<CompanyAccountType[]> {
  // so this function is passed the necessary accountsId already so no need to try and get this again
  try {
    // Step 1: Get the accounts document using the accountId
    const companyAccountsDocRef = doc(db, "companies", companyDocId, "manualAccounts"); // Assuming your collection for accounts is 'accounts'
    const manualAccountsDocSnapshot = await getDoc(companyAccountsDocRef);

    if (!manualAccountsDocSnapshot.exists()) {
      console.error(
        "Manual Accounts document not found for companyId:",
        companyDocId,
      );
      return [];
    }

    const manualAccountsData = manualAccountsDocSnapshot.data();

    // Return the accounts array or an empty array if not present
    return manualAccountsData.accounts || [];
  } catch (error) {
    console.error("Error fetching manual accounts from Firestore:", error);
    return [];
  }
}
