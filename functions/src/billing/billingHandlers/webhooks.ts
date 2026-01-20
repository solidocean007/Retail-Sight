// functions/src/billing/billing.webhooks.ts

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import { syncBillingFromSubscription } from "../billingHelpers";
import { getAddonId } from "../addonMap";
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
      const company = companySnap.docs[0].data();

      // ==========================
      // 1️⃣ Canonical billing sync
      // ==========================
      const result = await syncBillingFromSubscription(companyId, subscription);

      // ==========================
      // 2️⃣ Payment status overrides
      // ==========================
      let paymentStatus = result.status;

      if (kind.includes("past_due")) paymentStatus = "past_due";
      if (kind.includes("canceled")) paymentStatus = "canceled";

      await companyRef.update({
        "billing.paymentStatus": paymentStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ==========================
      // 3️⃣ Apply deferred add-on removals (FULL removal at renewal)
      // ==========================
      const isRenewalEvent =
        kind === "subscription_charged_successfully" ||
        kind === "subscription_renewed";

      const pending = company.billing?.pendingAddonRemoval;

      if (isRenewalEvent && pending) {
        const addonId = getAddonId(subscription.planId, pending.addonType);

        const updateRes = await gateway.subscription.update(subscription.id, {
          addOns: { remove: [addonId] },
        } as any);

        if (updateRes.success) {
          await companyRef.update({
            "billing.pendingAddonRemoval": admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // ==========================
      // 4️⃣ Audit log (non-blocking)
      // ==========================
      await db.collection("billingLogs").add({
        companyId,
        subscriptionId: subscription.id,
        event: kind,
        status: paymentStatus,
        amount: result.totalMonthlyCost,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("🔥 Webhook failed:", err.message);
      res.status(500).send("Webhook error");
    }
  }
);
