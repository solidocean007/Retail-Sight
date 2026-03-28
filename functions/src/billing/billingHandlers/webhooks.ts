// functions/src/billing/billing.webhooks.ts

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import {
  refreshBillingFromGateway,
  syncBillingFromSubscription,
} from "../billingHelpers";
import {
  BRAINTREE_ENVIRONMENT,
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_PRIVATE_KEY,
  BRAINTREE_PUBLIC_KEY,
} from "../braintreeSecrets";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type PaymentStatus = "active" | "past_due" | "canceled";

/**
 * Derives the company payment status from a Braintree webhook event.
 *
 * IMPORTANT:
 * - Webhooks may arrive out of order.
 * - Unknown events should NEVER downgrade state.
 * - `previous` is treated as the source of truth fallback.
 */
function derivePaymentStatusFromSubscription(
  subscription: any,
  previous: PaymentStatus
): PaymentStatus {
  const status = String(subscription.status);

  switch (status) {
    case "Active":
      return "active";

    case "Past Due":
      return "past_due";

    case "Canceled":
    case "Expired":
      return "canceled";

    case "Pending":
    case "Pending Payment":
      // 🔑 CRITICAL:
      // Never downgrade on pending during upgrades
      return previous === "active" ? "active" : previous;

    default:
      return previous;
  }
}

/**
 * 🔔 Braintree Webhook Handler (Server-to-Server)
 * Authoritative source of billing truth.
 */
export const handleBraintreeWebhook = onRequest(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (req, res) => {
    try {
      const btSignature = req.body?.bt_signature;
      const btPayload = req.body?.bt_payload;

      if (!btSignature || !btPayload) {
        res.status(400).send("Missing bt_signature or bt_payload");
        return;
      }
      const gateway = getBraintreeGateway();
      // Braintree typings are incomplete — cast intentionally
      const notification = (await gateway.webhookNotification.parse(
        btSignature,
        btPayload
      )) as any;

      const kind = String(notification.kind);
      const subscription = notification.subscription;

      if (!subscription?.id) {
        console.warn("⚠️ Webhook without subscription");
        res.status(200).json({ ignored: true });
        return;
      }

      const eventId = `${notification.timestamp}_${kind}_${subscription.id}`;

      const eventRef = db.collection("webhookEvents").doc(eventId);
      const existing = await eventRef.get();

      if (existing.exists) {
        res.status(200).json({ duplicate: true });
        return;
      }

      await eventRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🔍 Find company by subscriptionId
      const companySnap = await db
        .collection("companies")
        .where("billing.subscriptionId", "==", subscription.id)
        .limit(1)
        .get();

      if (companySnap.empty) {
        console.warn("⚠️ No company for subscription:", subscription.id);
        res.status(200).json({ ignored: true });
        return;
      }

      const companyRef = companySnap.docs[0].ref;
      const companyId = companyRef.id;

      // ==========================
      // 1️⃣ Canonical billing sync
      // ==========================
      const result = await syncBillingFromSubscription(companyId, subscription);

      // 2️⃣ Authoritative payment state
      let nextStatus: PaymentStatus | undefined;

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(companyRef);
        const prevStatus = snap.data()?.billing?.paymentStatus ?? "active";

        let computed = derivePaymentStatusFromSubscription(
          subscription,
          prevStatus
        );

        if (kind === "subscription_canceled") {
          computed = "canceled";
        }

        nextStatus = computed;

        const update: Record<string, any> = {
          "billing.paymentStatus": computed,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (computed === "past_due") {
          update["billing.pastDueSince"] =
            snap.data()?.billing?.pastDueSince ??
            admin.firestore.FieldValue.serverTimestamp();
        }

        if (computed === "active" || computed === "canceled") {
          update["billing.pastDueSince"] = admin.firestore.FieldValue.delete();
        }

        tx.update(companyRef, update);
      });

      if (!nextStatus) {
        console.warn("Missing nextStatus after transaction");
        res.status(200).json({ ignored: true });
        return;
      }

      // If subscription truly canceled outside scheduled downgrade → move to free
      if (
        nextStatus === "canceled" &&
        String(subscription.status) === "Canceled"
      ) {
        const snap = await companyRef.get();
        const currentBilling = snap.data()?.billing;

        if (currentBilling?.plan !== "free") {
          await companyRef.update({
            "billing.plan": "free",
            "billing.subscriptionId": admin.firestore.FieldValue.delete(),
            "billing.pendingChange": admin.firestore.FieldValue.delete(),
            subscriptionTier: "free",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // 3️⃣ Renewal-only operations
      const isRenewalEvent =
        kind === "subscription_charged_successfully" ||
        kind === "subscription_renewed";

      if (isRenewalEvent) {
        await applyScheduledDowngradeAfterRenewal(companyId);
      }

      // ==========================
      // 4️⃣ Audit log (non-blocking)
      // ==========================
      await db.collection("billingLogs").add({
        companyId,
        subscriptionId: subscription.id,
        event: kind,
        status: nextStatus,
        amount: result.totalMonthlyCost,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ received: true });
      return;
    } catch (err: any) {
      console.error("🔥 Webhook failed:", err.message);
      res.status(500).send("Webhook error");
    }
  }
);

/**
 * Applies a scheduled billing downgrade at renewal time.
 *
 * Called ONLY from the Braintree webhook after a successful renewal charge.
 * - Updates the subscription to the pending plan/add-ons
 * - Clears `billing.pendingChange`
 * - Re-syncs billing state from Braintree
 *
 * @param companyId Firestore company document ID
 */
/**
 * Applies scheduled downgrade AFTER renewal charge.
 * This does NOT create a new billing cycle —
 * it updates the plan that will govern the NEXT cycle.
 */
async function applyScheduledDowngradeAfterRenewal(companyId: string) {
  const ref = admin.firestore().doc(`companies/${companyId}`);
  const snap = await ref.get();
  const billing = snap.data()?.billing;

  if (!billing?.subscriptionId) return;

  const pending = billing?.pendingChange;
  if (!pending) return;

  const gateway = getBraintreeGateway();

  // ✅ SPECIAL CASE: Downgrade to Free
  if (pending.nextPlanId === "free") {
    // Cancel paid subscription
    await gateway.subscription.cancel(billing.subscriptionId);

    // Clear subscription + move to free tier
    await ref.update({
      "billing.plan": "free",
      "billing.subscriptionId": admin.firestore.FieldValue.delete(),
      "billing.rawPaymentStatus": "canceled",
      "billing.pendingChange": admin.firestore.FieldValue.delete(),
      subscriptionTier: "free",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return;
  }

  // ✅ Paid → Paid downgrade
  await gateway.subscription.update(billing.subscriptionId, {
    planId: pending.nextPlanId,
    prorateCharges: false,
  } as any);

  await ref.update({
    "billing.pendingChange": admin.firestore.FieldValue.delete(),
  });

  await refreshBillingFromGateway(companyId, billing.subscriptionId);
}
