import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import { loadFreePlanAssignment } from "../planResolution";

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

        const freePlan = await loadFreePlanAssignment(data.companyType);
        await doc.ref.update({
          "billing.plan": "free",
          "billing.planDocId": freePlan.planDocId,
          "billing.paymentStatus": "canceled",
          "billing.totalMonthlyCost": 0,
          "billing.subscriptionId": admin.firestore.FieldValue.delete(),
          "billing.renewalDate": admin.firestore.FieldValue.delete(),
          "billing.billingPeriodEnd": admin.firestore.FieldValue.delete(),
          "billing.pendingChange": admin.firestore.FieldValue.delete(),
          "billing.pastDueSince": admin.firestore.FieldValue.delete(),
          "limits.userLimit": freePlan.userLimit,
          "limits.connectionLimit": freePlan.connectionLimit,
          subscriptionTier: "free",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`Failed enforcing grace period for ${doc.id}`, err);
      }
    }
  }
);
