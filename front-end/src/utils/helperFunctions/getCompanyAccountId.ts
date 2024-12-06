// getCompanyAccountId.ts
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../firebase";

const getCompanyAccountId = async (companyId: string): Promise<string | null> => {
  try {
    const companyDocRef = doc(db, "companies", companyId);
    const companySnapshot = await getDoc(companyDocRef);

    if (companySnapshot.exists()) {
      const { accountsId } = companySnapshot.data();
      return accountsId || null; // Return accountsId or null if not present
    } else {
      console.warn(`Company document does not exist for companyId: ${companyId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching accountId for company:", error);
    return null;
  }
};

export default getCompanyAccountId;
