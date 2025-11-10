/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";
import dotenv = require("dotenv");
import braintree = require("braintree");

dotenv.config();
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 🔐 Configure and export the shared Braintree gateway instance.
 *
 * This gateway is used by all Cloud Functions to interact with Braintree’s API
 * (e.g. creating customers, subscriptions, updating add-ons, etc.).
 *
 * The credentials are pulled from Firebase environment variables set via:
 *    firebase functions:config:set braintree.merchant_id="..." braintree.public_key="..." ...
 */
export const gateway = new braintree.BraintreeGateway({
  environment:
    process.env.BRAINTREE_ENVIRONMENT === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production,
  merchantId: process.env.BRAINTREE_MERCHANT_ID!,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
});

/**
 * 🧩 syncPlanLimits
 *
 * Synchronizes a company document’s plan-related limits and price
 * with the corresponding plan document in Firestore.
 *
 * @param {string} companyId - The Firestore ID of the company whose plan should be synced.
 * @param {string} planId - The Firestore plan document ID (matches the Braintree planId).
 * @return {Promise<void>} Resolves after Firestore is updated.
 *
 * If the plan document cannot be found, the company is downgraded to a Free fallback plan
 * with safe default limits.
 */
export async function syncPlanLimits(
  companyId: string,
  planId: string
): Promise<void> {
  const companyRef = db.collection("companies").doc(companyId);
  const planRef = db.collection("plans").doc(planId);

  try {
    const planSnap = await planRef.get();

    if (!planSnap.exists) {
      console.warn(
        `⚠️ Plan ${planId} not found in Firestore. Using Free fallback.`
      );
      const fallbackLimits = { userLimit: 5, connectionLimit: 2 };
      await companyRef.update({
        limits: fallbackLimits,
        "billing.plan": "free",
        "billing.price": 0,
        updatedAt: admin.firestore.Timestamp.now(),
      });
      return;
    }

    const planData = planSnap.data() || {};

    const limits = {
      userLimit: planData.userLimit ?? 5,
      connectionLimit: planData.connectionLimit ?? 2,
    };

    const planPrice = planData.price ?? 0;

    await companyRef.update({
      limits,
      "billing.plan": planId,
      "billing.price": planPrice,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log(
      `✅ Synced plan limits for ${companyId}: ${planId}`,
      limits,
      `Price: $${planPrice}`
    );
  } catch (error) {
    console.error(`❌ Failed to sync plan limits for ${companyId}:`, error);
  }
}

/**
 * 🔄 updateBraintreeSubscription
 *
 * Updates an existing Braintree subscription with new data (plan changes, add-ons, etc.)
 * and ensures prorated billing is applied automatically.
 *
 * @param {string} subscriptionId - The unique Braintree subscription ID to update.
 * @param {any} updateData - Fields to modify on the subscription, e.g. planId or addOns.
 * @return {Promise<braintree.Subscription>} The updated Braintree Subscription object.
 *
 * Example:
 * ```ts
 * await updateBraintreeSubscription(subscriptionId, {
 *   planId: "network",
 *   addOns: { update: [{ existingId: "extraUser", quantity: 3 }] },
 * });
 * ```
 */
export async function updateBraintreeSubscription(
  subscriptionId: string,
  updateData: any
): Promise<braintree.Subscription> {
  console.log("🔄 Updating subscription:", { subscriptionId, updateData });

  try {
    const result = await gateway.subscription.update(subscriptionId, {
      ...updateData,
      options: {
        replaceAllAddOnsAndDiscounts: false,
        prorateCharges: true,
      },
    });

    if (!result.success) {
      throw new Error(result.message || "Braintree subscription update failed");
    }

    console.log("✅ Subscription updated:", {
      id: result.subscription?.id,
      plan: result.subscription?.planId,
    });

    return result.subscription;
  } catch (err: any) {
    console.error("🔥 updateBraintreeSubscription error:", err.message);
    throw err;
  }
}
