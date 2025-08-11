// companyLogic.ts
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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

// optional: define a type for clarity
type CompanyLimits = { maxUsers: number; maxConnections: number };
type NewCompanyOptions = {
  tier?: "freeLimited" | "pro" | "enterprise" | "freeNoLimits";
  limits?: CompanyLimits;
  verified?: boolean;                 // canonical new field
  companyVerified?: boolean;          // legacy (kept for compatibility)
  userTypeHint?: "distributor" | "supplier"; // to pick sensible free limits
  extra?: Record<string, any>;        // future-proofing for one-offs
};

export const createNewCompany = async (
  companyName: string,
  userId: string,
  options: NewCompanyOptions = {}
) => {
  const {
    userTypeHint,
    tier = "free",
    verified = false,
    companyVerified = false, // keep legacy mirror; prefer `verified` going forward
    limits = userTypeHint === "supplier"
      ? { maxUsers: 1, maxConnections: 1 } // these fields should be set eventually by me in my developer dashboard.. so when we write the cloud function these fields given now can be
      // defaults
      : { maxUsers: 5, maxConnections: 1 },
    extra = {},
  } = options;

  const companyNameNormalized = normalizeCompanyInput(companyName);
  const nowISO = new Date().toISOString();

  const newCompanyData = {
    // ---- canonical fields (new)
    companyName,                          // as entered
    companyNameNormalized,                // normalized for lookups
    verified,                             // new canonical verification flag
    tier,                                 // "free" | "pro" | "enterprise"
    limits,                               // { maxUsers, maxConnections }
    usersCount: 1,                        // creator will be first user (even if pending)
    connectionsCount: 0,

    createdBy: userId,
    createdAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),

    // ---- legacy fields (kept so you don't break existing code)
    altCompanyNames: [companyNameNormalized],
    adminsUsers: [userId],                // you may later flip to provisional
    employeeUsers: [],
    statusPendingUsers: [],               // consider deprecating after you rely on accessRequests
    companyVerified: companyVerified,     // legacy mirror of `verified`
    createdAtISO: nowISO,                 // your old string field (ok to keep during transition)

    // ---- safe extensibility (future flags, branding, etc.)
    ...extra,
  };

  try {
    const docRef = await addDoc(collection(db, "companies"), newCompanyData);
    // Return a consistent shape (id + companyId both present)
    return { id: docRef.id, companyId: docRef.id, ...newCompanyData };
  } catch (error) {
    console.error("Error creating new company: ", error);
    throw error;
  }
};
