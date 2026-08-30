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
 * Legacy self-serve Braintree plan ids from before the plans catalog carried
 * the `selfServe` flag. Used ONLY as an emergency fallback when the catalog
 * cannot be read, so existing customers can still buy the original ladder.
 * Deliberately excludes "test" and "healy_plan" — those were never meant to
 * be generally purchasable — and "custom_contract", which always requires
 * the explicit planDocId flow.
 */
export const LEGACY_SELF_SERVE_PLAN_IDS = [
  "starter",
  "team",
  "pro",
  "enterprise",
];

/**
 * The sellable plan catalog, keyed by Braintree plan id.
 *
 * Source of truth is the `plans` collection (`selfServe == true`), so adding
 * a sellable plan is a Firestore doc + Braintree plan — no deploy. Each value
 * carries the catalog metadata (family, active, docId) the callables need to
 * authorize a purchase.
 *
 * Returns null when the catalog can't be read or is empty (seed not run /
 * outage) — callers should then fall back to LEGACY_SELF_SERVE_PLAN_IDS.
 *
 * "custom_contract" is intentionally NEVER included: whale deals must go
 * through the explicit planDocId flow in the callables, which verifies the
 * contract doc belongs to the subscribing company.
 */
export async function getSellablePlans(): Promise<Map<string, any> | null> {
  try {
    const snap = await db
      .collection("plans")
      .where("selfServe", "==", true)
      .get();
    const plans = new Map<string, any>();
    snap.forEach((doc) => {
      const data = doc.data();
      const bt = data?.braintreePlanId;
      if (typeof bt === "string" && bt && bt !== "custom_contract") {
        plans.set(bt, { docId: doc.id, ...data });
      }
    });
    return plans.size > 0 ? plans : null;
  } catch (err) {
    console.warn("getSellablePlans: catalog unavailable", err);
    return null;
  }
}

/**
 * 🔄 Canonical Firestore billing sync
 * Used by:
 * - createSubscription
 * - changePlanAndRestartBillingCycle
 * - webhooks
 */
export async function syncBillingFromSubscription(
  companyId: string,
  subscription: any,
  planDocIdHint?: string
) {
  if (!subscription?.id || !subscription?.planId) {
    throw new Error("Invalid subscription object");
  }

  const companyRef = db.collection("companies").doc(companyId);

  // Resolve the plan doc that defines this subscription's limits.
  //
  // Custom contracts all share the single Braintree plan id
  // "custom_contract", so a braintreePlanId query cannot pick the right doc.
  // Resolution order:
  //   1. explicit hint from the caller (createSubscription / changePlan);
  //   2. the company's stored `billing.planDocId` (webhook path);
  //   3. legacy query by braintreePlanId (doc id == plan id for standard
  //      plans, so this keeps working for every pre-existing subscription).
  let planDoc: any = null;

  const tryDoc = async (id: unknown) => {
    if (planDoc || typeof id !== "string" || !id) return;
    const snap = await db.collection("plans").doc(id).get();
    if (snap.exists && snap.data()?.braintreePlanId === subscription.planId) {
      planDoc = snap;
    }
  };

  await tryDoc(planDocIdHint);
  if (!planDoc) {
    const companySnap = await companyRef.get();
    await tryDoc(companySnap.data()?.billing?.planDocId);
  }
  if (!planDoc) {
    const q = await db
      .collection("plans")
      .where("braintreePlanId", "==", subscription.planId)
      .limit(1)
      .get();
    if (!q.empty) planDoc = q.docs[0];
  }

  if (!planDoc) {
    console.warn("⚠️ No plan found for:", subscription.planId);
  }

  const price = Number(subscription.price || 0);
  const toDate = (d: any) => (d?.toDate ? d.toDate() : new Date(d));

  const update: any = {
    "billing.plan": subscription.planId,
    "billing.subscriptionId": subscription.id,
    "billing.rawPaymentStatus": subscription.status,
    "billing.renewalDate": toDate(subscription.nextBillingDate),
    "billing.billingPeriodEnd": subscription.billingPeriodEndDate,
    "billing.totalMonthlyCost": price,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (planDoc) {
    const plan = planDoc.data();

    update["limits.userLimit"] = plan.userLimit;
    update["limits.connectionLimit"] = plan.connectionLimit;
    update["subscriptionTier"] = subscription.planId;
    // Remember which catalog doc governs this subscription — required to
    // resolve custom contracts on future webhook syncs, harmless for
    // standard plans (doc id == plan id).
    update["billing.planDocId"] = planDoc.id;
  }

  await companyRef.update(update);

  return {
    planId: subscription.planId,
    rawStatus: subscription.status,
    totalMonthlyCost: price,
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
