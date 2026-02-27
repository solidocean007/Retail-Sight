// functions/src/billing/billingHelpers.ts

/**
 * BILLING RULES (LOCKED)
 *
 * 1. Plans start a new billing cycle immediately.
 * 2. Plan upgrades cancel old subscription and create a new one.
 * 3. Plan downgrades are scheduled at renewal.
 * 4. No add-ons.
 * 5. No proration.
 * 6. Webhooks are source of truth.
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

import { getBraintreeGateway } from "./braintreeGateway";

const db = admin.firestore();

/**
 * 🔄 Canonical Firestore billing sync
 * Used by:
 * - createSubscription
 * - changePlanAndRestartBillingCycle
 * - webhooks
 */
export async function syncBillingFromSubscription(
  companyId: string,
  subscription: any
) {
  if (!subscription?.id || !subscription?.planId) {
    throw new Error("Invalid subscription object");
  }

  const companyRef = db.collection("companies").doc(companyId);

  await companyRef.update({
    "billing.plan": subscription.planId,
    "billing.subscriptionId": subscription.id,
    "billing.rawPaymentStatus": subscription.status,
    "billing.renewalDate": subscription.nextBillingDate,
    "billing.billingPeriodEnd": subscription.billingPeriodEndDate,
    "billing.totalMonthlyCost": subscription.price
      ? Number(subscription.price)
      : 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // sync plan limits
  const planSnap = await db
    .collection("plans")
    .where("braintreePlanId", "==", subscription.planId)
    .limit(1)
    .get();

  if (!planSnap.empty) {
    const plan = planSnap.docs[0].data();

    await companyRef.update({
      "limits.userLimit": plan.userLimit,
      "limits.connectionLimit": plan.connectionLimit,
      subscriptionTier: subscription.planId,
    });
  }

  return {
    planId: subscription.planId,
    rawStatus: subscription.status,
    totalMonthlyCost: subscription.price ? Number(subscription.price) : 0,
  };
}

/**
 * Reads subscription fresh from Braintree and syncs Firestore.
 * Use when Firestore may be stale.
 */
export async function refreshBillingFromGateway(
  companyId: string,
  subscriptionId: string
) {
  const gateway = getBraintreeGateway();
  const subscription = await gateway.subscription.find(subscriptionId);
  return syncBillingFromSubscription(companyId, subscription);
}
