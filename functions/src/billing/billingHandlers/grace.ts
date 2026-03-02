import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";

const db = admin.firestore();

const GRACE_PERIOD_DAYS = 7;

export const enforcePastDueGracePeriod = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "America/New_York",
  },
  async () => {
    const snap = await db
      .collection("companies")
      .where("billing.paymentStatus", "==", "past_due")
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const billing = data.billing;

      if (!billing?.pastDueSince) continue;

      const pastDueDate = billing.pastDueSince.toDate();
      const daysPastDue =
        (Date.now() - pastDueDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysPastDue < GRACE_PERIOD_DAYS) continue;

      console.log(
        `⛔ Grace period expired for company ${doc.id}. Moving to free.`
      );

      try {
        if (billing.subscriptionId) {
          const gateway = getBraintreeGateway();
          await gateway.subscription.cancel(billing.subscriptionId);
        }

        await doc.ref.update({
          "billing.plan": "free",
          "billing.paymentStatus": "canceled",
          "billing.subscriptionId": admin.firestore.FieldValue.delete(),
          "billing.pendingChange": admin.firestore.FieldValue.delete(),
          "billing.pastDueSince": admin.firestore.FieldValue.delete(),
          subscriptionTier: "free",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`Failed enforcing grace period for ${doc.id}`, err);
      }
    }
  }
);
