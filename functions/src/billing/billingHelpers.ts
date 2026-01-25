// functions/src/billing/billingHelpers.ts

/**
 * BILLING RULES (LOCKED)
 *
 * 1. Plans start a new billing cycle immediately.
 * 2. Plan upgrades cancel old subscription and create a new one.
 * 3. Plan downgrades are scheduled at renewal.
 * 4. Add-ons are charged immediately.
 * 5. Add-on removals are scheduled and applied at renewal.
 * 6. No proration anywhere.
 * 7. Webhooks are the source of truth.
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

import { getBraintreeGateway } from "./braintreeGateway";
import { addonIdToAddonType, AddonType } from "./addonMap";

const db = admin.firestore();

/**
 * Calculates total monthly cost from a Braintree subscription.
 * Canonical source of truth for billing math.
 */
export function calculateSubscriptionTotal(subscription: any): number {
  let total = parseFloat(subscription.price ?? "0");

  subscription.addOns?.forEach((addon: any) => {
    total += parseFloat(addon.amount ?? "0") * (addon.quantity ?? 1);
  });

  return Number(total.toFixed(2));
}

/**
 * Converts Braintree add-ons → Firestore billing.addons map
 */
export function extractAddonQuantities(
  subscription: any
): Record<AddonType, number> {
  const addons: Record<AddonType, number> = {
    extraUser: 0,
    extraConnection: 0,
  };

  subscription.addOns?.forEach((addon: any) => {
    const type = addonIdToAddonType(addon.id);
    if (type) {
      addons[type] = addon.quantity ?? 0;
    }
  });

  return addons;
}

/**
 * 🔄 Canonical Firestore billing sync
 * Used by:
 * - createSubscription
 * - changePlanAndRestartBillingCycle
 * - webhooks
 * - add/remove addon flows
 */
export async function syncBillingFromSubscription(
  companyId: string,
  subscription: any
) {
  if (!subscription?.id || !subscription?.planId) {
    throw new Error(
      "Invalid subscription object passed to syncBillingFromSubscription"
    );
  }

  const companyRef = db.collection("companies").doc(companyId);

  const total = calculateSubscriptionTotal(subscription);

  function normalizePaymentStatus(
    status: string
  ): "active" | "past_due" | "canceled" {
    if (status === "canceled") return "canceled";
    if (status === "past_due") return "past_due";

    // pending, active, trialing, authorized, etc.
    return "active";
  }

  const snap = await companyRef.get();
  const existingBilling = snap.data()?.billing ?? {};
  const addons = extractAddonQuantities(subscription);

  await companyRef.update({
    billing: {
      ...existingBilling, // ← preserves customerId, locks, pending changes
      plan: subscription.planId,
      subscriptionId: subscription.id,
      paymentStatus: normalizePaymentStatus(subscription.status),

      renewalDate: subscription.nextBillingDate
        ? admin.firestore.Timestamp.fromDate(
            new Date(subscription.nextBillingDate)
          )
        : null,
      billingPeriodEnd: subscription.paidThroughDate
        ? admin.firestore.Timestamp.fromDate(
            new Date(subscription.paidThroughDate)
          )
        : null,

      totalMonthlyCost: total,
      addons: {
        extraUser: addons.extraUser ?? 0,
        extraConnection: addons.extraConnection ?? 0,
      },
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

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
  } else {
    console.warn(
      `No plan document found for braintreePlanId=${subscription.planId}`
    );
  }

  return {
    planId: subscription.planId,
    status: subscription.status,
    totalMonthlyCost: total,
    nextBillingDate: subscription.nextBillingDate,
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
