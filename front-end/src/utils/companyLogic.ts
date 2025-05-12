// companyLogic.ts
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import { CompanyType } from "./types";

export const normalizeCompanyInput = (input: string) => {
  // Remove all spaces (including those in the middle of the string) and convert to lowercase
  return input.replace(/\s+/g, "").toLowerCase();
};

export const findMatchingCompany = async (normalizedInput: string) => {
  const companiesRef = collection(db, "companies");
  const q = query(
    companiesRef,
    where("alt-company-names", "array-contains", normalizedInput),
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // Assuming you want the first matching company
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...(doc.data() as CompanyType) };
  } else {
    // no companies found so return null and then create a new company where this is called
    return null;
  }
};

export const createNewCompany = async (companyName: string, userId: string) => {
  const timeNow = new Date().toISOString();
  const normalizedCompanyName = normalizeCompanyInput(companyName);
  const newCompanyData = {
    lastUpdated: timeNow, // begin to track the last time it was updated
    companyName: companyName,
    altCompanyNames: [normalizedCompanyName], // Initialize with the companyName lower case without spaces
    adminsUsers: [userId], // Set the creator as the first admin
    employeeUsers: [],
    statusPendingUsers: [],
    companyVerified: false,
    createdAt: timeNow,
  };

  try {
    const docRef = await addDoc(collection(db, "companies"), newCompanyData);
    return { id: docRef.id, ...newCompanyData, companyId: docRef.id };
  } catch (error) {
    console.error("Error creating new company: ", error);
    // Additional error handling as needed
  }
};
