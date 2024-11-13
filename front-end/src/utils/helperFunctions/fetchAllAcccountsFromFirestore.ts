import { doc, getDoc } from 'firebase/firestore';
import { CompanyAccountType } from '../types';
import { db } from '../firebase';


// Fetch all accounts from Firestore
export async function fetchAllAccountsFromFirestore(accountId: string): Promise<CompanyAccountType[]> {
  console.log("Fetching accounts with accountId:", accountId);
  const accountsDocRef = doc(db, 'accounts', accountId);

  try {
    const accountsSnapshot = await getDoc(accountsDocRef);

    if (!accountsSnapshot.exists()) {
      console.error("Accounts document not found for accountId:", accountId);
      return [];
    }

    const data = accountsSnapshot.data();
    console.log("Fetched accounts data:", data);

    return data.accounts || []; // Return the array of accounts if present, otherwise an empty array
  } catch (error) {
    console.error("Error fetching accounts from Firestore:", error);
    return [];
  }
}
