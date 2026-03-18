import { onSchedule } from "firebase-functions/scheduler";
import * as admin from "firebase-admin";

const getCompanyAccountId = async (
  companyId: string
): Promise<string | null> => {
  try {
    const companySnapshot = await db
      .collection("companies")
      .doc(companyId)
      .get();

    if (!companySnapshot.exists) {
      console.warn(`Company document missing for companyId: ${companyId}`);
      return null;
    }

    const data = companySnapshot.data();

    return data?.accountsId ?? null;
  } catch (error) {
    console.error("Error fetching accountsId:", error);
    return null;
  }
};

const db = admin.firestore();

export const autoApplyAccountImports = onSchedule(
  "every 10 minutes",
  async () => {
    const now = Date.now();

    const snap = await db
      .collection("accountImports")
      .where("status", "==", "pending")
      .where("autoApplyAfter", "<=", now)
      .get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      const accountsId = await getCompanyAccountId(data.companyId);

      if (!accountsId) {
        console.warn("Missing accountsId for company", data.companyId);
        continue;
      }

      const accountsDoc = await db.collection("accounts").doc(accountsId).get();

      const existingAccounts = accountsDoc.data()?.accounts || [];

      const map = new Map(
        existingAccounts.map((a: any) => [a.accountNumber, a])
      );

      data.changes.forEach((diff: any) => {
        map.set(diff.accountNumber, diff.updated);
      });

      await db
        .collection("accounts")
        .doc(accountsId)
        .update({
          accounts: Array.from(map.values()),
        });

      await docSnap.ref.update({
        status: "applied",
        autoApplied: true,
        appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
