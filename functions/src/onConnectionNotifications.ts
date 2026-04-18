// functions/src/onConnectionNotifications.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Watches companyConnections changes and sends emails for:
 * 1. New brand proposal
 * 2. Brand accepted
 * 3. Brand rejected
 */
export const onConnectionNotifications = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    try {
      const beforePending: any[] = before.pendingBrands || [];
      const afterPending: any[] = after.pendingBrands || [];

      const beforeShared: string[] = before.sharedBrandNames || [];
      const afterShared: string[] = after.sharedBrandNames || [];

      const beforeDeclined: string[] = before.declinedBrands || [];
      const afterDeclined: string[] = after.declinedBrands || [];

      const fromCompanyId = after.requestFromCompanyId;
      const toCompanyId = after.requestToCompanyId;

      const fromCompanyName = after.requestFromCompanyName || "Partner Company";
      const toCompanyName = after.requestToCompanyName || "Partner Company";

      // --------------------------------------------------
      // Helpers
      // --------------------------------------------------

      const getAdminEmails = async (companyId: string): Promise<string[]> => {
        const snap = await db
          .collection("users")
          .where("companyId", "==", companyId)
          .where("role", "in", ["admin", "super-admin"])
          .get();

        return snap.docs
          .map((d) => d.data()?.email)
          .filter(Boolean)
          .map((e) => String(e).toLowerCase());
      };

      const queueEmail = async (
        recipients: string[],
        subject: string,
        html: string
      ) => {
        if (!recipients.length) return;

        await db.collection("mail").add({
          to: recipients,
          category: "transactional",
          message: {
            subject,
            html,
          },
          queuedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      };

      const pendingBrandsBefore = beforePending.map((b) => b.brand);
      const pendingBrandsAfter = afterPending.map((b) => b.brand);

      // ==================================================
      // 1. NEW PROPOSAL
      // ==================================================
      const newPending = pendingBrandsAfter.filter(
        (b) => !pendingBrandsBefore.includes(b)
      );

      if (newPending.length > 0) {
        const emails = await getAdminEmails(toCompanyId);

        await queueEmail(
          emails,
          `${fromCompanyName} proposed new shared brands`,
          `
          <h2>New Shared Brand Proposal</h2>
          <p><strong>${fromCompanyName}</strong> proposed the following brands:</p>
          <ul>
            ${newPending.map((b) => `<li>${b}</li>`).join("")}
          </ul>
          <p>Log in to Displaygram to review.</p>
        `
        );
      }

      // ==================================================
      // 2. ACCEPTED
      // ==================================================
      const accepted = afterShared.filter((b) => !beforeShared.includes(b));

      if (accepted.length > 0) {
        const emails = await getAdminEmails(fromCompanyId);

        await queueEmail(
          emails,
          `${toCompanyName} accepted shared brands`,
          `
          <h2>Brand Proposal Accepted</h2>
          <p><strong>${toCompanyName}</strong> accepted:</p>
          <ul>
            ${accepted.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        `
        );
      }

      // ==================================================
      // 3. REJECTED
      // ==================================================
      const rejected = afterDeclined.filter((b) => !beforeDeclined.includes(b));

      if (rejected.length > 0) {
        const emails = await getAdminEmails(fromCompanyId);

        await queueEmail(
          emails,
          `${toCompanyName} declined shared brands`,
          `
          <h2>Brand Proposal Declined</h2>
          <p><strong>${toCompanyName}</strong> declined:</p>
          <ul>
            ${rejected.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        `
        );
      }

      // ==================================================
      // 4. REMOVED FROM APPROVED
      // ==================================================
      const removed = beforeShared.filter((b) => !afterShared.includes(b));
      if (removed.length > 0) {
        const emails = await getAdminEmails(toCompanyId);

        await queueEmail(
          emails,
          `${fromCompanyName} removed shared brands`,
          `
          <h2>Shared Brands Removed</h2>
          <p><strong>${fromCompanyName}</strong> removed:</p>
          <ul>
            ${removed.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        `
        );
      }

      console.log("✅ Connection notifications processed");
    } catch (err) {
      console.error("❌ onConnectionNotifications error:", err);
    }
  }
);
