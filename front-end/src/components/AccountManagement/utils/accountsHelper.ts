import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "@firebase/firestore";
import { CompanyAccountType } from "../../../utils/types";
import { db } from "../../../utils/firebase";

export function mergeAccountsByNumber(
  existing: CompanyAccountType[],
  incoming: CompanyAccountType[],
): CompanyAccountType[] {
  const accountMap: { [key: string]: CompanyAccountType } = {};

  for (const acc of [...existing, ...incoming]) {
    const { accountNumber, salesRouteNums = [] } = acc;
    if (!accountMap[accountNumber]) {
      accountMap[accountNumber] = {
        ...acc,
        salesRouteNums: [...salesRouteNums],
      };
    } else {
      const currentRoutes = accountMap[accountNumber].salesRouteNums || [];
      accountMap[accountNumber] = {
        ...accountMap[accountNumber],
        ...acc,
        salesRouteNums: Array.from(
          new Set([...currentRoutes, ...salesRouteNums.map(String)]),
        ),
      };
    }
  }

  return Object.values(accountMap);
}

export const writeAccountsToFirestore = async (
  companyId: string,
  accounts: CompanyAccountType[],
) => {
  const companyDocRef = doc(db, "companies", companyId);
  const companySnap = await getDoc(companyDocRef);

  if (companySnap.exists()) {
    const { accountsId } = companySnap.data();
    if (accountsId) {
      const accountsDocRef = doc(db, "accounts", accountsId);
      await updateDoc(accountsDocRef, { accounts });
    } else {
      const newDocRef = await addDoc(collection(db, "accounts"), { accounts });
      await updateDoc(companyDocRef, { accountsId: newDocRef.id });
    }
  }
};

export const writeCustomerTypesToCompany = async (
  companyId: string,
  accounts: CompanyAccountType[],
) => {
  const customerTypes = Array.from(
    new Set(accounts.map((a) => a.typeOfAccount).filter(Boolean)),
  );

  const chains = Array.from(
    new Set(accounts.map((a) => a.chain?.trim().toUpperCase()).filter(Boolean)),
  );

  const companyRef = doc(db, "companies", companyId);
  await setDoc(
    companyRef,
    { customerTypes, chains }, // ✅ Store both
    { merge: true },
  );
};
