// utils/helperFunctions/getCompanyProductsId.ts
import { doc, getDoc } from "@firebase/firestore";
import { db } from "../firebase";

const getCompanyProductsId = async (
  companyId: string,
): Promise<string | null> => {
  try {
    const companyDocRef = doc(db, "companies", companyId);
    const companySnapshot = await getDoc(companyDocRef);

    if (companySnapshot.exists()) {
      const { productsId } = companySnapshot.data();
      return productsId || null; // Return productsId or null if not present
    } else {
      console.warn(`Company document does not exist for companyId: ${companyId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching productsId for company:", error);
    return null;
  }
};

export default getCompanyProductsId;
