// functions/src/billing/usageCounters.ts

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

import { onDocumentUpdated } from "firebase-functions/firestore";

export const onUserStatusChange = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    if (before.status !== after.status) {
      const delta =
        before.status !== "active" && after.status === "active"
          ? 1
          : before.status === "active" && after.status !== "active"
            ? -1
            : 0;

      if (delta !== 0 && after.companyId) {
        await admin
          .firestore()
          .doc(`companies/${after.companyId}`)
          .update({
            "usage.users": admin.firestore.FieldValue.increment(delta),
          });
      }
    }
  }
);

export const onConnectionStatusChange = onDocumentUpdated(
  "companyConnections/{id}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    if (before.status === after.status) return;

    const delta =
      before.status !== "approved" && after.status === "approved"
        ? 1
        : before.status === "approved" && after.status !== "approved"
          ? -1
          : 0;

    if (delta === 0) return;

    const companyIds = [
      after.requestFromCompanyId,
      after.requestToCompanyId,
    ].filter(Boolean);

    await Promise.all(
      companyIds.map((companyId) =>
        admin
          .firestore()
          .doc(`companies/${companyId}`)
          .update({
            "usage.connections": admin.firestore.FieldValue.increment(delta),
          })
      )
    );
  }
);
