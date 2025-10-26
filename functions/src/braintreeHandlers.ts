/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import dotenv = require("dotenv");
import braintree = require("braintree");
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import {
  syncPlanLimits,
  updateBraintreeSubscription,
} from "./braintreeHelpers";

dotenv.config();
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// --- Configure Braintree Gateway ---
const gateway = new braintree.BraintreeGateway({
  environment:
    process.env.BRAINTREE_ENVIRONMENT === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production,
  merchantId: process.env.BRAINTREE_MERCHANT_ID!,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
});

/**
 * Sync company plan limits and price from Firestore.
 * Ensures Firestore's company document reflects the latest plan settings.
 *
 * @param {string} companyId - Firestore company document ID
 * @param {string} planId - The current planId (matches Braintree planId)
 */

/**
 * 🔄 updateSubscriptionWithProration
 * Switches an existing subscription to a new plan and prorates the charge automatically.
 */
export const updateSubscriptionWithProration = onCall(async (request) => {
  const { companyId, newPlanId, addons = [] } = request.data || {};

  if (!companyId || !newPlanId) {
    throw new HttpsError("invalid-argument", "Missing companyId or newPlanId.");
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const billing = companySnap.data()?.billing;
  const subscriptionId = billing?.subscriptionId;
  if (!subscriptionId) {
    throw new HttpsError(
      "failed-precondition",
      "Company has no active subscription."
    );
  }

  console.log(
    "🔍 Using Braintree merchant:",
    process.env.BRAINTREE_MERCHANT_ID
  );
  console.log("🔍 Updating subscription:", subscriptionId);

  try {
    // 🔹 Step 1: Switch to the new plan (remove old add-ons)
    const removeIds = [
      "freePlanExtraUser",
      "freePlanExtraConnection",
      "teamPlanExtraUser",
      "teamPlanExtraConnection",
      "networkPlanExtraUser",
      "networkPlanExtraConnection",
    ];

    const updateResult = await gateway.subscription.update(subscriptionId, {
      planId: newPlanId,
      prorateCharges: true,
      addOns: { remove: removeIds },
    } as any);

    if (!updateResult.success) {
      console.error("❌ Plan upgrade failed:", updateResult);
      throw new HttpsError("internal", "Failed to update subscription plan.");
    }

    const updatedSub = updateResult.subscription;

    // 🔹 Step 2: Re-add any selected add-ons (if chosen in CheckoutModal)
    if (addons.length > 0) {
      console.log(
        `🧩 Re-adding ${addons.length} add-ons for new plan ${newPlanId}`
      );

      const reAddPayload: any = {
        addOns: {
          add: addons.map((a: any) => {
            // Map Firestore add-on name → proper Braintree ID
            const addonId = `${newPlanId}Plan${
              a.id === "extraUser" ? "ExtraUser" : "ExtraConnection"
            }`;
            return { inheritedFromId: addonId, quantity: a.quantity || 1 };
          }),
        },
        prorateCharges: true,
      };

      const reAddRes = await gateway.subscription.update(
        subscriptionId,
        reAddPayload
      );
      if (!reAddRes.success) {
        console.warn("⚠️ Add-on reapply failed:", reAddRes);
      }
    }

    // 🔹 Step 3: Compute totals and update Firestore
    const newAddonsObj: Record<string, number> = {};
    if (addons.length > 0) {
      for (const a of addons) {
        newAddonsObj[a.id] = a.quantity || 1;
      }
    }

    let total = parseFloat(updatedSub.price ?? "0");
    updatedSub.addOns?.forEach((a) => {
      total += parseFloat(a.amount ?? "0") * (a.quantity ?? 1);
    });

    await companyRef.update({
      "billing.plan": newPlanId,
      "billing.totalMonthlyCost": total,
      "billing.price": updatedSub.price,
      "billing.paymentStatus":
        updatedSub.status?.toLowerCase?.() === "active" ? "active" : "pending",
      "billing.renewalDate": new Date(updatedSub.nextBillingDate),
      addons: newAddonsObj, // reset or overwrite
      updatedAt: admin.firestore.Timestamp.now(),
    });

    await syncPlanLimits(companyId, newPlanId);

    console.log(`✅ Upgraded ${companyId} → ${newPlanId} (addons reset)`);

    return {
      success: true,
      status: updatedSub.status,
      nextBillingDate: updatedSub.nextBillingDate,
    };
  } catch (err: any) {
    console.error("❌ Error updating subscription with proration:", err);
    return {
      success: false,
      message: "Subscription upgrade failed.",
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      subscriptionId,
      error: err?.message,
      type: err?.type || "unknown",
    };
  }
});

/* ========================================================
   1️⃣ Create Customer
======================================================== */
export const createBraintreeCustomer = onCall(async (request) => {
  const { companyId, companyName, email } = request.data;

  if (!companyId || !companyName || !email) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: companyId, companyName, email."
    );
  }

  const result = await gateway.customer.create({
    firstName: companyName,
    email,
    customFields: { companyId },
  });

  if (!result.success || !result.customer?.id) {
    throw new HttpsError(
      "internal",
      result.message || "Failed to create customer."
    );
  }

  return { customerId: result.customer.id };
});

/* ========================================================
   2️⃣ Create Subscription (Clean, Production-Ready)
======================================================== */
export const createSubscription = onCall(async (request) => {
  const { companyId, companyName, email, paymentMethodNonce, planId, addons } =
    request.data;

  if (!companyId || !planId || !paymentMethodNonce) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const companyRef = db.doc(`companies/${companyId}`);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const data = companySnap.data() || {};
  const billing = data.billing;

  // 🔄 Cancel existing subscription if needed
  const existingSubId = billing?.subscriptionId;
  const existingStatus = billing?.paymentStatus;
  if (existingSubId && existingStatus !== "canceled") {
    console.log(
      `🔄 Canceling old subscription ${existingSubId} before upgrade.`
    );
    try {
      await gateway.subscription.cancel(existingSubId);
    } catch (err) {
      console.warn("⚠️ Failed to cancel old subscription:", err);
    }
  }

  // 1️⃣ Ensure customer exists
  let customerId = billing?.braintreeCustomerId;
  if (!customerId) {
    const custResult = await gateway.customer.create({
      firstName: companyName || "Unnamed Company",
      company: companyName || "Unnamed Company",
      email: email || "unknown@displaygram.com",
    });

    if (!custResult.success || !custResult.customer?.id) {
      console.error("❌ Customer creation failed:", custResult);
      throw new HttpsError("internal", "Braintree customer creation failed.");
    }

    customerId = custResult.customer.id;

    await companyRef.set(
      { "billing.braintreeCustomerId": customerId },
      { merge: true }
    );
  }

  // 2️⃣ Vault payment method for recurring use
  const paymentRes = await gateway.paymentMethod.create({
    customerId,
    paymentMethodNonce,
    options: { makeDefault: true },
  });

  if (!paymentRes.success || !paymentRes.paymentMethod?.token) {
    console.error("❌ Payment method creation failed:", paymentRes);
    throw new HttpsError("internal", "Failed to create payment method.");
  }

  const token = paymentRes.paymentMethod.token;

  // 3️⃣ Create subscription using vaulted token
  const subResult = await gateway.subscription.create({
    paymentMethodToken: token,
    planId,
  } as any);

  if (!subResult.success || !subResult.subscription) {
    console.error("❌ Braintree subscription creation failed:", subResult);
    throw new HttpsError("internal", "Braintree subscription failed.");
  }

  const sub = subResult.subscription;

  // 4️⃣ Optional: Add-ons
  if (addons?.length) {
    const updatePayload: any = {
      addOns: {
        add: addons.map((a: any) => ({
          inheritedFromId: a.id,
          quantity: a.quantity || 1,
        })),
      },
    };

    const updateRes = await gateway.subscription.update(sub.id, updatePayload);
    if (!updateRes.success) {
      console.warn("⚠️ Add-on update failed (continuing):", updateRes);
    }
  }

  // 5️⃣ Sync Firestore

  const totalCost = parseFloat(sub.price ?? "0");
  const addOnCost = sub.addOns?.reduce(
    (sum: number, addon: any) =>
      sum + parseFloat(addon.amount ?? "0") * (addon.quantity ?? 1),
    0
  );
  const totalMonthlyCost = totalCost + (addOnCost || 0);

  await companyRef.set(
    {
      plan: planId,
      planPrice: Number(sub.price),
      billing: {
        ...data.billing,
        braintreeCustomerId: customerId,
        subscriptionId: sub.id,
        paymentStatus:
          sub.status?.toLowerCase() === "active" ? "active" : "pending",
        renewalDate: new Date(sub.nextBillingDate),
        lastPaymentDate: new Date(sub.createdAt),
        totalMonthlyCost, // ✅ add this
      },
      updatedAt: new Date(),
    },
    { merge: true }
  );

  await syncPlanLimits(companyId, planId);

  console.log(`✅ Subscription created for ${companyId} → ${planId}`);

  return {
    status: sub.status,
    subscriptionId: sub.id,
    nextBillingDate: sub.nextBillingDate,
  };
});

/* ========================================================
   3️⃣ Cancel Subscription
======================================================== */
export const cancelSubscription = onCall(async (request) => {
  const { companyId, nextPlanId } = request.data;

  if (!companyId) {
    throw new HttpsError("invalid-argument", "Missing companyId.");
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  const billing = companySnap.data()?.billing;

  if (!billing?.subscriptionId) {
    throw new HttpsError(
      "failed-precondition",
      "No active subscription found."
    );
  }

  // 1️⃣ Cancel active sub
  const cancelResult = (await gateway.subscription.cancel(
    billing.subscriptionId
  )) as unknown as braintree.ValidatedResponse<braintree.Subscription>;

  if (!cancelResult.success) {
    throw new HttpsError("internal", "Failed to cancel subscription.");
  }

  const renewalDate = billing.renewalDate
    ? new Date(billing.renewalDate.seconds * 1000)
    : null;

  // 2️⃣ Update Firestore
  await companyRef.update({
    "billing.paymentStatus": "canceled",
    "billing.canceledAt": admin.firestore.Timestamp.now(),
    "billing.nextPlanId": nextPlanId || null,
    "billing.nextPlanStart": renewalDate
      ? admin.firestore.Timestamp.fromDate(renewalDate)
      : null,
  });

  console.log(
    `✅ Scheduled downgrade for ${companyId} to ${nextPlanId} on ${renewalDate}`
  );

  return {
    message: "Subscription canceled; downgrade will take effect next cycle.",
  };
});

/* ========================================================
   4️⃣ Handle Webhook
======================================================== */
export const handleBraintreeWebhook = onCall(async (request) => {
  const { btSignature, btPayload } = request.data;

  const notification = (await gateway.webhookNotification.parse(
    btSignature,
    btPayload
  )) as any;

  const eventType: string = notification.kind;
  const subscription = notification.subscription as braintree.Subscription;

  if (!subscription?.id) {
    console.warn("⚠️ Missing subscription ID in webhook.");
    return { ok: false };
  }

  // Find matching company by subscriptionId
  const companyQuery = await db
    .collection("companies")
    .where("billing.subscriptionId", "==", subscription.id)
    .limit(1)
    .get();

  if (companyQuery.empty) {
    console.warn("⚠️ No company found for subscription:", subscription.id);
    return { ok: false };
  }

  const companyRef = companyQuery.docs[0].ref;
  const companyId = companyRef.id;

  // Determine new payment status
  let paymentStatus = "active";
  if (eventType.includes("past_due")) {
    paymentStatus = "past_due";
  }
  if (eventType.includes("canceled")) {
    paymentStatus = "canceled";
  }

  // --- Sync add-ons ---
  const addonsFromBraintree: Record<string, number> = {};
  subscription.addOns?.forEach((addon: any) => {
    addonsFromBraintree[addon.id] = addon.quantity;
  });

  // --- Compute total cost (plan + addons) ---
  let total = parseFloat(subscription.price ?? "0");
  subscription.addOns?.forEach((addon: any) => {
    total += parseFloat(addon.amount ?? "0") * (addon.quantity ?? 1);
  });

  // --- Load limits + plan info from Firestore plans collection ---
  const planId = subscription.planId;
  const planSnap = await db.collection("plans").doc(planId).get();
  const planData = planSnap.exists ? planSnap.data() : undefined;
  const planPrice = planData?.price ?? parseFloat(subscription.price ?? "0");

  const limits = planData
    ? {
        userLimit: planData.userLimit ?? 5,
        connectionLimit: planData.connectionLimit ?? 1,
      }
    : undefined;

  // --- Update company billing document ---
  const updateData: any = {
    "billing.plan": planId,
    "billing.price": planPrice,
    "billing.paymentStatus": paymentStatus,
    "billing.renewalDate": subscription.nextBillingDate
      ? admin.firestore.Timestamp.fromDate(
          new Date(subscription.nextBillingDate)
        )
      : null,
    "billing.lastPaymentDate": admin.firestore.Timestamp.now(),
    "billing.totalMonthlyCost": total,
    addons: addonsFromBraintree,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  if (limits) {
    updateData.limits = limits;
  }

  await companyRef.update(updateData);

  console.log(
    `✅ Synced webhook for ${companyId}: plan=${planId}, status=${paymentStatus}, total=$${total.toFixed(
      2
    )}`
  );

  // --- Log event for analytics / developer dashboard ---
  await db.collection("billingLogs").add({
    companyId,
    plan: planId,
    event: eventType,
    amount: total,
    timestamp: admin.firestore.Timestamp.now(),
  });

  return { received: true };
});

/* ========================================================
   5️⃣ Generate Client Token
======================================================== */
export const getClientToken = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const companyId = request.data?.companyId;

  if (!companyId) {
    throw new HttpsError(
      "failed-precondition",
      "Missing companyId in auth token."
    );
  }

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found in Firestore.");
  }

  const billing = companySnap.data()?.billing;
  const customerId = billing?.braintreeCustomerId || undefined;

  const result = await gateway.clientToken.generate(
    customerId ? { customerId } : {}
  );

  return { clientToken: result.clientToken };
});

/**
 * Removes a recurring add-on (e.g. extraUsers or extraConnections)
 * from a company's active subscription in Braintree and Firestore.
 *
 * You can toggle whether removals take effect immediately (with proration)
 * or at the next billing cycle via the `IMMEDIATE_REMOVAL` flag.
 */
/* ========================================================
   🔼 Add Add-on (Tier-Aware)
======================================================== */
export const addAddon = onCall(async (request) => {
  const { companyId, addonType, quantity } = request.data;

  if (!companyId || !addonType || typeof quantity !== "number") {
    throw new HttpsError(
      "invalid-argument",
      "Missing or invalid fields: companyId, addonType, quantity."
    );
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const companyData = companySnap.data()!;
  const billing = companyData.billing;

  if (!billing?.subscriptionId || !billing?.plan) {
    throw new HttpsError(
      "failed-precondition",
      "No active subscription or missing plan info."
    );
  }

  // 🔹 Determine correct tier-based add-on ID
  // e.g. "teamPlanExtraUser" or "networkPlanExtraConnection"
  const currentPlan = billing.plan;
  const addonId = `${currentPlan}Plan${
    addonType === "extraUser" ? "ExtraUser" : "ExtraConnection"
  }`;

  console.log(`🧩 Adding addon for ${companyId}: ${addonId} x${quantity}`);

  // 🔹 Apply to Braintree
  await updateBraintreeSubscription(billing.subscriptionId, {
    addOns: { add: [{ inheritedFromId: addonId, quantity }] },
  });

  // 🔹 Update Firestore cache
  const addons = companyData.addons || {};
  addons[addonType] = (addons[addonType] || 0) + quantity;

  await companyRef.update({
    addons,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log(`✅ Added ${quantity} ${addonId} for ${companyId}`);
  console.log("📡 DEBUG AddAddon Params:", {
    companyId,
    addonType,
    quantity,
    subscriptionId: billing.subscriptionId,
    plan: billing.plan,
  });

  return { success: true, addonId, quantity };
});

/* ========================================================
   🔽 Remove Add-on (Tier-Aware)
======================================================== */
export const removeAddon = onCall(async (request) => {
  const { companyId, addonType, quantity } = request.data;

  if (!companyId || !addonType || typeof quantity !== "number") {
    throw new HttpsError(
      "invalid-argument",
      "Missing or invalid fields: companyId, addonType, quantity."
    );
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const companyData = companySnap.data()!;
  const billing = companyData.billing;
  const addons = companyData.addons || {};

  if (!billing?.subscriptionId || !billing?.plan) {
    throw new HttpsError(
      "failed-precondition",
      "No active subscription or missing plan info."
    );
  }

  const currentQty = addons[addonType] ?? 0;
  if (currentQty <= 0) {
    throw new HttpsError("failed-precondition", "No add-ons to remove.");
  }

  // 🔹 Correct tier-based ID (singular-safe)
  const currentPlan = billing.plan;
  const addonId = `${currentPlan}Plan${
    addonType === "extraUser" ? "ExtraUser" : "ExtraConnection"
  }`;

  const newQty = Math.max(0, currentQty - quantity);
  console.log(
    `🧩 Removing ${quantity} from ${addonId} (newQty=${newQty}) for ${companyId}`
  );

  const updateData =
    newQty === 0
      ? { addOns: { remove: [addonId] } }
      : { addOns: { update: [{ existingId: addonId, quantity: newQty }] } };

  await updateBraintreeSubscription(billing.subscriptionId, updateData);

  // 🔹 Sync Firestore
  addons[addonType] = newQty;
  await companyRef.update({
    addons,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log(`✅ Updated ${addonId} quantity to ${newQty} for ${companyId}`);
  return { success: true, newQuantity: newQty, addonId };
});

/* ========================================================
   🔄 Sync Add-on Usage (auto adjusts for user counts)
======================================================== */
export const syncAddonUsage = onDocumentUpdated(
  "companies/{companyId}",
  async (event) => {
    const after = event.data?.after?.data();
    const companyId = event.params.companyId;
    if (!after?.billing?.subscriptionId) {
      return;
    }

    // Count active users
    const userSnap = await db
      .collection("users")
      .where("companyId", "==", companyId)
      .where("status", "==", "active")
      .get();

    const activeUsers = userSnap.size;
    const planUserLimit = after.limits?.userLimit ?? 5;
    const paidAddonQty = Math.max(0, activeUsers - planUserLimit);

    const currentQty = after.addons?.extraUser ?? 0;
    if (paidAddonQty === currentQty) {
      return;
    }

    console.log(
      `🔄 Syncing add-ons for ${companyId}: ${paidAddonQty} extra users`
    );

    await gateway.subscription.update(after.billing.subscriptionId, {
      addOns: { update: [{ existingId: "extraUser", quantity: paidAddonQty }] },
      prorateCharges: true,
    } as any);

    await db.collection("companies").doc(companyId).update({
      "addons.extraUser": paidAddonQty,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
);

export const calculateSubscriptionTotal = async (companyId: string) => {
  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  const billing = companySnap.data()?.billing;

  if (!billing?.subscriptionId) {
    return 0;
  }

  const sub = await gateway.subscription.find(billing.subscriptionId);

  let total = parseFloat(sub.price ?? "0");

  sub.addOns?.forEach((addon: any) => {
    total += parseFloat(addon.amount ?? "0") * (addon.quantity ?? 1);
  });

  return total;
};

export const updatePaymentMethod = onCall(async (request) => {
  const { companyId, paymentMethodNonce } = request.data;
  if (!companyId || !paymentMethodNonce) {
    throw new HttpsError("invalid-argument", "Missing fields.");
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  const billing = companySnap.data()?.billing;

  if (!billing?.braintreeCustomerId) {
    throw new HttpsError("failed-precondition", "No customer ID found.");
  }

  // Add new payment method
  const result = await gateway.paymentMethod.create({
    customerId: billing.braintreeCustomerId,
    paymentMethodNonce,
    options: { makeDefault: true },
  });

  if (!result.success) {
    throw new HttpsError("internal", "Failed to update payment method.");
  }

  await companyRef.update({
    "billing.lastPaymentUpdate": admin.firestore.Timestamp.now(),
  });

  console.log(`✅ Updated payment method for ${companyId}`);
  return { success: true };
});

export const listPlansAndAddons = onCall(async () => {
  try {
    const result = await gateway.plan.all();

    return result.plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price ?? "0"), // handle undefined
      billingFrequency: p.billingFrequency,
      addOns:
        p.addOns?.map((a) => ({
          id: a.id,
          name: a.name,
          amount: parseFloat(a.amount ?? "0"), // ✅ safe default
          description: a.description ?? "",
        })) || [],
    }));
  } catch (error) {
    console.error("❌ Failed to list Braintree plans:", error);
    throw new HttpsError("internal", "Unable to fetch plans from Braintree.");
  }
});
