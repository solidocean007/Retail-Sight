import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const getConnectedDistributorStores = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const distributorCompanyId = String(
    request.data?.distributorCompanyId || ""
  ).trim();
  if (!distributorCompanyId) {
    throw new HttpsError(
      "invalid-argument",
      "Distributor company is required."
    );
  }

  const userSnap = await db.doc(`users/${request.auth.uid}`).get();
  const supplierCompanyId = userSnap.data()?.companyId;
  if (!supplierCompanyId || supplierCompanyId === distributorCompanyId) {
    throw new HttpsError("permission-denied", "Supplier company not found.");
  }

  const connectionsSnap = await db
    .collection("companyConnections")
    .where("status", "==", "approved")
    .where("companyIds", "array-contains", supplierCompanyId)
    .get();
  const approvedConnection = connectionsSnap.docs.find((docSnap) => {
    const connection = docSnap.data();
    return (
      (connection.requestFromCompanyId === supplierCompanyId &&
        connection.requestToCompanyId === distributorCompanyId &&
        connection.requestFromCompanyType === "supplier" &&
        connection.requestToCompanyType === "distributor") ||
      (connection.requestToCompanyId === supplierCompanyId &&
        connection.requestFromCompanyId === distributorCompanyId &&
        connection.requestToCompanyType === "supplier" &&
        connection.requestFromCompanyType === "distributor")
    );
  });
  if (!approvedConnection) {
    throw new HttpsError(
      "permission-denied",
      "No approved distributor connection."
    );
  }

  const distributorSnap = await db
    .doc(`companies/${distributorCompanyId}`)
    .get();
  const accountsId = distributorSnap.data()?.accountsId;
  if (!accountsId) return { stores: [] };

  const accountsSnap = await db.doc(`accounts/${accountsId}`).get();
  const accounts = accountsSnap.data()?.accounts;
  if (!Array.isArray(accounts)) return { stores: [] };

  const clean = (value: unknown) => String(value || "").trim();
  const stores = accounts.map((account: Record<string, unknown>) => ({
    accountNumber: clean(account.accountNumber),
    accountName: clean(account.accountName),
    accountAddress: clean(account.accountAddress),
    streetAddress: clean(account.streetAddress),
    city: clean(account.city),
    state: clean(account.state),
    typeOfAccount: clean(account.typeOfAccount),
    chain: clean(account.chain),
    chainType: clean(account.chainType),
    salesRouteNums: [],
  }));
  return { stores };
});
