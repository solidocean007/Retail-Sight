// companyLogic.ts
import { serverTimestamp, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CompanyType } from "./types";

export const normalizeCompanyInput = (input: string) => {
  // Implement normalization logic (e.g., trim, convert to lowercase)
  return input.toLowerCase().trim();
};

export const findMatchingCompany = async (normalizedInput: string) => {
  const companiesRef = collection(db, "companies");
  const q = query(companiesRef, where("altCompanyNames", "array-contains", normalizedInput));

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // Assuming you want the first matching company
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() as CompanyType };
  } else {
    // no companies found so return null and then create a new company where this is called
    return null;
  }
};

export const createNewCompany = async (companyName: string, userId: string) => {
  const normalizedCompanyName = normalizeCompanyInput(companyName);
  const newCompanyData = {
    companyName: companyName,
    altCompanyNames: [normalizedCompanyName], // Initialize with the companyName
    admins: [userId], // Set the creator as the first admin
    employees: [],
    statusPending: [],
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "companies"), newCompanyData);
  return { id: docRef.id, ...newCompanyData };
};


