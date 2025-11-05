import { doc, getDoc } from "firebase/firestore";
import { CompanyAccountType } from "../types";
import { db } from "../firebase";

// Fetch all accounts from Firestore
export async function fetchAllAccountsFromFirestore(
  companyAcctsDocId: string,
): Promise<CompanyAccountType[]> {
  // so this function is passed the necessary accountsId already so no need to try and get this again
  try {
    // Step 1: Get the accounts document using the accountId
    const accountsDocRef = doc(db, "accounts", companyAcctsDocId); // Assuming your collection for accounts is 'accounts'
    const accountsSnapshot = await getDoc(accountsDocRef);

    if (!accountsSnapshot.exists()) {
      console.error(
        "Accounts document not found for accountId:",
        companyAcctsDocId,
      );
      return [];
    }

    const accountsData = accountsSnapshot.data();

    // Return the accounts array or an empty array if not present
    return accountsData.accounts || [];
  } catch (error) {
    console.error("Error fetching accounts from Firestore:", error);
    return [];
  }
}
