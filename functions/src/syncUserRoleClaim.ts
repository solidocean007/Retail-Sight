import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

export const syncUserClaims = onDocumentWritten(
  {
    region: "us-central1",
    document: "users/{uid}",
  },
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after?.data();

    if (!after) {
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    const role = after.role ?? "employee";
    const companyId = after.companyId ?? null;

    const user = await admin.auth().getUser(uid);
    const existing = user.customClaims || {};

    const changed =
      existing.role !== role || existing.companyId !== companyId;

    if (!changed) {
      return;
    }

    await admin.auth().setCustomUserClaims(uid, {
      ...existing,
      role,
      companyId,
    });

    console.log("Claims updated", { uid, role, companyId });
  }
);