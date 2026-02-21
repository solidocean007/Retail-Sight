// functions/src/billing/usageCounters.ts

import * as admin from "firebase-admin";
import {
  onDocumentUpdated,
  onDocumentDeleted,
} from "firebase-functions/firestore";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Safely adjusts a numeric usage field without allowing negatives.
 */
async function adjustUsage(
  companyId: string,
  field: "usage.users" | "usage.connections",
  delta: number
) {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`companies/${companyId}`);
    const snap = await tx.get(ref);

    const current =
      field === "usage.users"
        ? (snap.data()?.usage?.users ?? 0)
        : (snap.data()?.usage?.connections ?? 0);

    const next = Math.max(0, current + delta);

    tx.update(ref, {
      [field]: next,
    });
  });
}

/**
 * USER STATUS CHANGE
 */
export const onUserStatusChange = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    if (before.status === after.status) return;

    const delta =
      before.status !== "active" && after.status === "active"
        ? 1
        : before.status === "active" && after.status !== "active"
          ? -1
          : 0;

    if (delta !== 0 && after.companyId) {
      await adjustUsage(after.companyId, "usage.users", delta);
    }
  }
);

/**
 * USER DELETION
 */
export const onUserDeleted = onDocumentDeleted(
  "users/{userId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    if (data.status === "active" && data.companyId) {
      await adjustUsage(data.companyId, "usage.users", -1);
    }
  }
);

/**
 * CONNECTION STATUS CHANGE
 */
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
        adjustUsage(companyId, "usage.connections", delta)
      )
    );
  }
);

/**
 * CONNECTION DELETION
 */
export const onConnectionDeleted = onDocumentDeleted(
  "companyConnections/{id}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    if (data.status === "approved") {
      const companyIds = [
        data.requestFromCompanyId,
        data.requestToCompanyId,
      ].filter(Boolean);

      await Promise.all(
        companyIds.map((companyId) =>
          adjustUsage(companyId, "usage.connections", -1)
        )
      );
    }
  }
);
