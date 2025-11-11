/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import dotenv = require("dotenv");
import braintree = require("braintree");
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { syncPlanLimits } from "./braintreeHelpers";
import { logger } from "firebase-functions/v2";

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

const ADDON_IDS: Record<string, Record<string, string>> = {
  free: {
    extraUser: "freePlanExtraUser",
    extraConnection: "freePlanExtraConnection",
  },
  team: {
    extraUser: "teamPlanExtraUser",
    extraConnection: "teamPlanExtraConnection",
  },
  network: {
    extraUser: "networkPlanExtraUser",
    extraConnection: "networkPlanExtraConnection",
  },
};

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
            const addonId = ADDON_IDS[newPlanId]?.[a.id];
            if (!addonId) {
              console.error(
                `❌ Unknown add-on mapping for plan: ${newPlanId}, type: ${a.id}`
              );
              throw new HttpsError(
                "invalid-argument",
                `No Braintree add-on ID found for plan ${newPlanId} and add-on ${a.id}.`
              );
            }

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
      "billing.addons": newAddonsObj, // reset or overwrite
      lastUpdated: admin.firestore.Timestamp.now(),
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

  // 3️⃣ Create subscription (force immediate billing)
  const subPayload: any = {
    paymentMethodToken: token,
    planId,
    // 👇 ensures immediate billing cycle starts today
    firstBillingDate: new Date(),
  };

  // include add-ons if user selected them
  if (addons?.length) {
    subPayload.addOns = {
      add: addons.map((a: any) => {
        const addonId = `${planId}Plan${
          a.id === "extraUser" ? "ExtraUser" : "ExtraConnection"
        }`;
        return {
          inheritedFromId: addonId,
          quantity: a.quantity || 1,
        };
      }),
    };
  }

  const subResult = await gateway.subscription.create(subPayload);

  if (!subResult.success || !subResult.subscription) {
    console.error("❌ Braintree subscription creation failed:", subResult);
    throw new HttpsError("internal", "Braintree subscription failed.");
  }

  const sub = subResult.subscription;

  // 4️⃣ Calculate total cost (plan + add-ons)
  const base = parseFloat(sub.price ?? "0");
  const addOnsTotal = sub.addOns?.reduce(
    (sum: number, a: any) =>
      sum + parseFloat(a.amount ?? "0") * (a.quantity ?? 1),
    0
  );
  const totalMonthlyCost = base + (addOnsTotal || 0);

  // 5️⃣ Track addon quantities for Firestore
  const addonsMap: Record<string, number> = {};
  if (addons?.length) {
    for (const a of addons) {
      addonsMap[a.id] = a.quantity ?? 1;
    }
  }

  // 6️⃣ Sync to Firestore
  await companyRef.set(
    {
      billing: {
        ...data.billing,
        braintreeCustomerId: customerId,
        plan: planId,
        planPrice: Number(sub.price),
        subscriptionId: sub.id,
        paymentStatus:
          sub.status?.toLowerCase() === "active" ? "active" : "pending",
        renewalDate: new Date(sub.nextBillingDate),
        lastPaymentDate: new Date(sub.createdAt),
        totalMonthlyCost,
        addons: addonsMap,
      },
      lastUpdatedAt: new Date(),
    },
    { merge: true }
  );

  // 7️⃣ Sync limits from plan document
  await syncPlanLimits(companyId, planId);

  console.log(`✅ Subscription created for ${companyId} → ${planId}`);
  console.log(`💵 Immediate charge: $${totalMonthlyCost.toFixed(2)}`);

  return {
    success: true,
    status: sub.status,
    subscriptionId: sub.id,
    nextBillingDate: sub.nextBillingDate,
    totalMonthlyCost,
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

  // 🔍 Find matching company by subscriptionId
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
  const companyData = companyQuery.docs[0].data();

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

  // --- Load plan info from Firestore ---
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

  // --- Apply pending add-on removals if this is a renewal webhook ---
  const isRenewalEvent =
    eventType.includes("subscription_charged_successfully") ||
    eventType.includes("subscription_renewed");

  if (isRenewalEvent && companyData.billing?.pendingAddonRemoval) {
    const pending = companyData.billing.pendingAddonRemoval;
    const addonId = ADDON_IDS[planId]?.[pending.addonType];
    if (addonId) {
      console.log(
        `🧩 Applying deferred add-on removal for ${companyId}: ${addonId}`
      );

      try {
        const updatePayload: any =
          pending.quantityRemoved <= 0
            ? { addOns: { remove: [addonId] } }
            : {
                addOns: {
                  update: [
                    { existingId: addonId, quantity: pending.newQty ?? 0 },
                  ],
                },
              };

        const result = await gateway.subscription.update(
          subscription.id,
          updatePayload
        );

        if (result.success) {
          console.log(
            `✅ Successfully applied deferred removal for ${addonId} on ${companyId}`
          );

          // 🧾 Recompute total cost after removal
          let newTotal = parseFloat(result.subscription.price ?? "0");
          result.subscription.addOns?.forEach((a: any) => {
            newTotal += parseFloat(a.amount ?? "0") * (a.quantity ?? 1);
          });

          await companyRef.update({
            "billing.addons": { ...addonsFromBraintree }, // synced fresh state
            "billing.totalMonthlyCost": newTotal,
            "billing.pendingAddonRemoval": admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.Timestamp.now(),
          });
        } else {
          console.warn(
            "⚠️ Failed to apply deferred add-on removal:",
            result.message
          );
        }
      } catch (err: any) {
        console.error(
          "🔥 Error applying deferred add-on removal:",
          err.message
        );
      }
    }
  }

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
    "billing.addons": addonsFromBraintree,
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

  // --- Log event for auditing ---
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
 * ✅ addAddon — Adds an add-on to an existing subscription,
 * or automatically creates a free-tier subscription if the company is on Free plan.
 */
export const addAddon = onCall(async (request) => {
  const { companyId, addonType, quantity = 1 } = request.data || {};

  if (!companyId || !addonType) {
    console.error("❌ Missing companyId or addonType");
    throw new HttpsError("invalid-argument", "Missing companyId or addonType.");
  }

  const companyRef = db.collection("companies").doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }

  const companyData = companySnap.data()!;
  const billing = companyData.billing || {};
  if (!billing?.braintreeCustomerId) {
    throw new HttpsError(
      "failed-precondition",
      "No Braintree customer. Please start a checkout to add payment method."
    );
  }

  console.log("=== [addAddon] Incoming request ===");
  console.log({ companyId, addonType, quantity });

  const customerId = billing.braintreeCustomerId;

  // 🔹 Retrieve customer from Braintree
  const customer = await gateway.customer.find(customerId).catch((err) => {
    console.error("❌ gateway.customer.find failed:", err);
    return null;
  });

  if (!customer) {
    throw new HttpsError("not-found", "Braintree customer not found.");
  }

  // 🔹 Use first available payment method
  const defaultPayment =
    customer.paymentMethods?.[0]?.token ||
    customer.creditCards?.[0]?.token ||
    null;

  if (!defaultPayment) {
    throw new HttpsError(
      "failed-precondition",
      "No payment method found for this customer."
    );
  }

  // Helper: update Firestore billing info
  const syncBilling = async (subscription: any) => {
    const base = parseFloat(subscription.price ?? "0");
    const addOns = subscription.addOns?.reduce(
      (sum: number, a: any) =>
        sum + parseFloat(a.amount ?? "0") * (a.quantity ?? 1),
      0
    );
    const total = base + addOns;

    console.log("🧾 Syncing subscription back to Firestore:", {
      id: subscription.id,
      total,
    });

    await companyRef.update({
      "billing.subscriptionId": subscription.id,
      "billing.paymentStatus": subscription.status,
      "billing.plan": subscription.planId || billing.plan || "free",
      "billing.totalMonthlyCost": total,
      "billing.lastPaymentDate": new Date(),
      updatedAt: new Date(),
    });
  };

  // ==========================
  // Case 1: existing subscription
  // ==========================
  if (billing.subscriptionId) {
    console.log("🧩 Found existing subscription:", billing.subscriptionId);
    console.log("🪄 Adding add-on:", addonType, "x", quantity);
    const addonId = ADDON_IDS[billing.plan]?.[addonType];
    if (!addonId) {
      console.error(
        `❌ Invalid add-on mapping for plan=${billing.plan}, type=${addonType}`
      );
      throw new HttpsError(
        "invalid-argument",
        `Unknown add-on mapping for plan ${billing.plan} and add-on ${addonType}`
      );
    }

    // ✅ Build full update payload for immediate charge
    const updatePayload: any = {
      addOns: {
        add: [
          {
            inheritedFromId: addonId,
            quantity,
          },
        ],
      },
      options: { prorateCharges: true }, // immediate billing on existing sub
    };

    const result = await gateway.subscription.update(
      billing.subscriptionId,
      updatePayload
    );

    if (!result.success) {
      throw new HttpsError(
        "internal",
        result.message || "Failed to add add-on."
      );
    }

    await syncBilling(result.subscription);

    // ✅ Update addons object in Firestore for tracking
    const addonsMap = companyData.addons || {};
    addonsMap[addonType] = (addonsMap[addonType] || 0) + quantity;

    await companyRef.update({
      "billing.addons": addonsMap,
      "billing.totalMonthlyCost": admin.firestore.FieldValue.increment(
        parseFloat(result.subscription.addOns?.[0]?.amount ?? "0") *
          (result.subscription.addOns?.[0]?.quantity ?? 1)
      ),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log("✅ Successfully added add-on to existing subscription.");
    return {
      status: result.subscription.status,
      subscriptionId: result.subscription.id,
      planId: result.subscription.planId,
    };
  }

  // ==========================
  // Case 2: no subscription yet
  // ==========================
  console.log(
    "🆕 No subscription found — creating Free plan subscription with add-on."
  );

  const addonId = `freePlan${
    addonType === "extraUser" ? "ExtraUser" : "ExtraConnection"
  }`;

  const result = await gateway.subscription.create({
    paymentMethodToken: defaultPayment,
    planId: "free",
    addOns: {
      add: [
        {
          inheritedFromId: addonId, // ✅ FIXED
          quantity,
        },
      ],
    },
  });

  if (!result.success) {
    throw new HttpsError(
      "internal",
      result.message || "Failed to create subscription."
    );
  }

  await syncBilling(result.subscription);

  console.log(
    "✅ Created Free plan subscription with add-on:",
    result.subscription.id
  );

  return {
    status: result.subscription.status,
    subscriptionId: result.subscription.id,
    planId: result.subscription.planId,
  };
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

  // ✅ Lookup add-on ID safely
  const addonId = ADDON_IDS[billing.plan]?.[addonType];
  if (!addonId) {
    throw new HttpsError(
      "invalid-argument",
      `Unknown add-on mapping for plan ${billing.plan} and add-on ${addonType}`
    );
  }

  const newQty = Math.max(0, currentQty - quantity);
  console.log(
    `🧩 Scheduling removal of ${quantity} from ${addonId} (newQty=${newQty}) for ${companyId}`
  );

  // 🔹 Queue the removal in Firestore (deferred until next billing cycle)
  await companyRef.update({
    [`addons.${addonType}`]: newQty,
    "billing.pendingAddonRemoval": {
      addonType,
      removeAt: billing.renewalDate || null,
      quantityRemoved: quantity,
    },
    updatedAt: admin.firestore.Timestamp.now(),
  });

  console.log(
    `✅ Queued ${addonType} removal for ${companyId} at next renewal (${billing.renewalDate})`
  );

  // 🔹 Optionally tell Braintree to apply this change at next billing
  try {
    const result = await gateway.subscription.update(billing.subscriptionId, {
      addOns: {
        update: [{ existingId: addonId, quantity: newQty }],
      },
      options: {
        // ✅ Correct property name
        replaceAllAddOnsAndDiscounts: false,
        prorateCharges: false, // optional: ensures no immediate charge/refund
      },
    });

    if (!result.success) {
      console.warn(
        "⚠️ Braintree update failed, will retry on webhook:",
        result.message
      );
    }
  } catch (err: any) {
    console.error(
      "🔥 Failed to schedule Braintree addon removal:",
      err.message
    );
  }

  return {
    success: true,
    message: `Add-on ${addonType} will remain active until the next billing cycle.`,
    newQuantity: newQty,
    effectiveDate: billing.renewalDate || "next renewal",
  };
});

/* ========================================================
   🔄 Sync Add-on Usage (auto adjusts for user counts)
======================================================== */
export const syncAddonUsage = onDocumentUpdated(
  "companies/{companyId}",
  async (event) => {
    const after = event.data?.after?.data();
    const companyId = event.params.companyId;

    if (!after?.billing?.subscriptionId || !after?.billing?.plan) {
      console.log(`⏭️ Skipping ${companyId} — no active subscription or plan.`);
      return;
    }

    const currentPlan = after.billing.plan;

    // 🧩 Skip enforcement for specific test company IDs if desired
    // (e.g., your dev/test company should not be billed automatically)
    if (!after.addons) {
      console.warn(
        `⚠️ No addons object on company ${companyId}, skipping sync.`
      );
      return;
    }

    try {
      // Count active users in Firestore
      const userSnap = await db
        .collection("users")
        .where("companyId", "==", companyId)
        .where("status", "==", "active")
        .get();

      const activeUsers = userSnap.size;
      const planUserLimit = after.limits?.userLimit ?? 5;
      const paidAddonQty = Math.max(0, activeUsers - planUserLimit);
      const currentQty = after.billing?.addons?.extraUser ?? 0;

      // 🧩 If nothing changed, skip
      if (paidAddonQty === currentQty) {
        console.log(`✅ No change in add-on quantity for ${companyId}`);
        return;
      }

      console.log(
        `🔄 Syncing add-ons for ${companyId}: ${paidAddonQty} extra users (was ${currentQty})`
      );

      // Correct add-on ID mapping based on the current plan
      const addonId = `${currentPlan}PlanExtraUser`; // ✅ Fix

      // Update subscription in Braintree
      const updatePayload: any =
        paidAddonQty === 0
          ? { addOns: { remove: [addonId] } }
          : {
              addOns: {
                update: [{ existingId: addonId, quantity: paidAddonQty }],
              },
              prorateCharges: true,
            };

      const result = await gateway.subscription.update(
        after.billing.subscriptionId,
        updatePayload
      );

      if (!result.success) {
        console.error("❌ Braintree update failed:", result.message);
        throw new Error(result.message || "Addon sync failed");
      }

      // Update Firestore
      await db.collection("companies").doc(companyId).update({
        "billing.addons.extraUser": paidAddonQty,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(
        `✅ Updated ${addonId} to ${paidAddonQty} for ${companyId} (plan: ${currentPlan})`
      );
    } catch (err: any) {
      console.error("🔥 syncAddonUsage failed for", companyId, err.message);
    }
  }
);

export const syncConnectionAddonUsage = onDocumentUpdated(
  "companies/{companyId}",
  async (event) => {
    const after = event.data?.after?.data();
    const companyId = event.params.companyId;

    if (!after?.billing?.subscriptionId || !after?.billing?.plan) {
      console.log(`⏭️ Skipping ${companyId} — no active subscription or plan.`);
      return;
    }

    const currentPlan = after.billing.plan;

    // Use the new nested structure
    const addons = after.billing?.addons || {};

    try {
      // Count approved connections
      const connSnap = await db
        .collection("companyConnections")
        .where("participants", "array-contains", companyId)
        .where("status", "==", "approved")
        .get();

      const activeConnections = connSnap.size;
      const planConnectionLimit = after.limits?.connectionLimit ?? 1;
      const paidAddonQty = Math.max(0, activeConnections - planConnectionLimit);
      const currentQty = addons.extraConnection ?? 0;

      if (paidAddonQty === currentQty) {
        console.log(`✅ No change in connection add-on for ${companyId}`);
        return;
      }

      console.log(
        `🔄 Syncing connection add-ons for ${companyId}: ${paidAddonQty} extra connections (was ${currentQty})`
      );

      const addonId = `${currentPlan}PlanExtraConnection`;

      const updatePayload: any =
        paidAddonQty === 0
          ? { addOns: { remove: [addonId] } }
          : {
              addOns: {
                update: [{ existingId: addonId, quantity: paidAddonQty }],
              },
              prorateCharges: true,
            };

      const result = await gateway.subscription.update(
        after.billing.subscriptionId,
        updatePayload
      );

      if (!result.success) {
        console.error(
          "❌ Braintree update failed for connections:",
          result.message
        );
        throw new Error(result.message || "Connection add-on sync failed");
      }

      await db.collection("companies").doc(companyId).update({
        "billing.addons.extraConnection": paidAddonQty,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      console.log(
        `✅ Updated ${addonId} to ${paidAddonQty} for ${companyId} (plan: ${currentPlan})`
      );
    } catch (err: any) {
      console.error(
        "🔥 syncConnectionAddonUsage failed for",
        companyId,
        err.message
      );
    }
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

// 🔥 Automatically runs whenever a new company doc is created
export const initCompanyBilling = onDocumentUpdated(
  {
    region: "us-central1",
    document: "companies/{companyId}",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const { companyId } = event.params;

    // 🧩 Only run when `verified` changes from false → true
    if (!before || !after) return;
    const wasVerified = Boolean(before.verified);
    const isVerified = Boolean(after.verified);
    if (wasVerified || !isVerified) return; // only trigger on first verification

    try {
      const companyName = after.name || companyId;
      const companyEmail =
        after.primaryContact?.email ||
        after.createdBy ||
        "unknown@displaygram.com";

      // 1️⃣ Create Braintree customer for this company
      const result = await gateway.customer.create({
        company: companyName,
        email: companyEmail,
      });

      if (!result.success || !result.customer?.id) {
        logger.error("❌ Failed to create Braintree customer:", result);
        return;
      }

      // 2️⃣ Write billing object into Firestore
      await db.doc(`companies/${companyId}`).set(
        {
          billing: {
            braintreeCustomerId: result.customer.id,
            plan: "free",
            planPrice: 0,
            userLimit: 5,
            connectionLimit: 2,
            addons: { extraUser: 0, extraConnection: 0 },
            paymentStatus: "inactive", // until first payment or upgrade
            renewalDate: null,
            lastPaymentDate: null,
            totalMonthlyCost: 0,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info(
        `✅ Initialized billing for verified company ${companyName} (${companyId})`
      );
    } catch (err) {
      logger.error("💥 initCompanyBilling failed:", err);
    }
  }
);

export const backfillBillingForCompanies = onCall(async (request) => {
  const allowedIds = [
    "DcYlhNNjYJQL2vrPPyrF",
    "GogGKnnpNNLrHP3c7cTh",
    "YBlIYQQt7vDPjhzYuZc7",
    "gK0PgUa3vHkwlb1z8CeS",
    "oL40cFJ3z2iv0neKyNDa",
  ];

  try {
    const results: Record<string, any> = {};

    for (const id of allowedIds) {
      const ref = db.collection("companies").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        results[id] = "❌ Not found in Firestore";
        continue;
      }

      const data = snap.data()!;
      if (data.billing?.braintreeCustomerId) {
        results[id] = "✅ Already has billing info";
        continue;
      }

      // 1️⃣ Create Braintree customer
      const customerRes = await gateway.customer.create({
        company: data.name || id,
      });

      if (!customerRes.success || !customerRes.customer?.id) {
        results[id] = `❌ Failed to create customer: ${customerRes.message}`;
        continue;
      }

      // 2️⃣ Write Firestore billing object
      await ref.set(
        {
          billing: {
            braintreeCustomerId: customerRes.customer.id,
            plan: "free",
            planPrice: 0,
            userLimit: 5,
            connectionLimit: 2,
            addons: { extraUser: 0, extraConnection: 0 },
            paymentStatus: "active",
            renewalDate: null,
            lastPaymentDate: null,
            totalMonthlyCost: 0,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      results[id] = `✅ Created customer ${customerRes.customer.id}`;
    }

    return results;
  } catch (err: any) {
    console.error("Backfill failed:", err);
    throw new HttpsError("internal", "Backfill failed", err);
  }
});
