/* eslint-disable indent */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import dotenv = require("dotenv");
import braintree = require("braintree");
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

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
 * Safely updates a Braintree subscription while ensuring prorated billing.
 *
 * @param {string} subscriptionId - The Braintree subscription ID to update.
 * @param {Record<string, any>} updateData - The update payload (e.g., addOns, plan changes, etc.).
 * @return {Promise<braintree.ValidatedResponse<braintree.Subscription>>} The validated Braintree update response.
 */
async function updateSubscriptionWithProration(
  subscriptionId: string,
  updateData: Record<string, any>
) {
  return gateway.subscription.update(subscriptionId, {
    ...updateData,
    prorateCharges: true,
  } as any);
}

/**
 * Sync company plan limits and price from Firestore.
 * Ensures Firestore's company document reflects the latest plan settings.
 *
 * @param {string} companyId - Firestore company document ID
 * @param {string} planId - The current planId (matches Braintree planId)
 */
export async function syncPlanLimits(companyId: string, planId: string) {
  const companyRef = db.collection("companies").doc(companyId);
  const planRef = db.collection("plans").doc(planId);

  try {
    const planSnap = await planRef.get();

    if (!planSnap.exists) {
      console.warn(
        `⚠️ Plan ${planId} not found in Firestore. Using Free fallback.`
      );
      const fallbackLimits = { userLimit: 5, connectionLimit: 1 };
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
      connectionLimit: planData.connectionLimit ?? 1,
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
 * Removes a recurring add-on (e.g. extraUsers or extraConnections)
 * from a company's active subscription in Braintree and Firestore.
 *
 * You can toggle whether removals take effect immediately (with proration)
 * or at the next billing cycle via the `IMMEDIATE_REMOVAL` flag.
 */
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
  const billing = companySnap.data()?.billing;
  const addons = companySnap.data()?.addons || {};

  if (!billing?.subscriptionId) {
    throw new HttpsError("failed-precondition", "No active subscription.");
  }

  const currentQty = addons[addonType] ?? 0;
  if (currentQty <= 0) {
    throw new HttpsError("failed-precondition", "No add-ons to remove.");
  }

  // Calculate the new reduced quantity
  const newQty = Math.max(0, currentQty - quantity);

  // ✅ If going to zero → remove the add-on from Braintree
  const updateData =
    newQty === 0
      ? {
          addOns: {
            remove: [addonType],
          },
        }
      : {
          addOns: {
            update: [{ existingId: addonType, quantity: newQty }],
          },
        };

  // ✅ Use the same wrapper for consistent proration behavior
  const result = await updateSubscriptionWithProration(
    billing.subscriptionId,
    updateData
  );

  if (!result.success) {
    throw new HttpsError(
      "internal",
      result.message || "Failed to remove add-on."
    );
  }

  // ✅ Reflect change in Firestore
  addons[addonType] = newQty;

  await companyRef.update({
    addons,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return {
    success: true,
    newQuantity: newQty,
    message:
      newQty === 0
        ? `Removed ${addonType} add-on entirely.`
        : `Reduced ${addonType} count to ${newQty}.`,
  };
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
   2️⃣ Create Subscription
======================================================== */
export const createSubscription = onCall(async (request) => {
  const {
    companyId,
    companyName,
    email,
    paymentMethodNonce,
    planId,
    customerId,
  } = request.data;

  if (!companyId || !companyName || !email || !paymentMethodNonce || !planId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: companyId, companyName, email, planId, or paymentMethodNonce."
    );
  }

  try {
    let braintreeCustomerId = customerId;

    // Step 1: Create Braintree customer if needed
    if (!braintreeCustomerId) {
      const customerResult = await gateway.customer.create({
        firstName: companyName,
        email,
      });
      if (!customerResult.success || !customerResult.customer?.id) {
        throw new HttpsError(
          "internal",
          "Failed to create Braintree customer."
        );
      }
      braintreeCustomerId = customerResult.customer.id;
    }

    // Step 2: Create payment method
    const paymentResult = await gateway.paymentMethod.create({
      customerId: braintreeCustomerId,
      paymentMethodNonce,
      options: { makeDefault: true },
    });
    if (!paymentResult.success) {
      throw new HttpsError(
        "internal",
        `Payment method creation failed: ${paymentResult.message}`
      );
    }

    // Step 3: Create subscription
    const subscriptionResult = (await gateway.subscription.create({
      paymentMethodToken: paymentResult.paymentMethod.token,
      planId,
    })) as braintree.ValidatedResponse<braintree.Subscription>;

    if (!subscriptionResult.success) {
      throw new HttpsError(
        "internal",
        `Subscription failed: ${subscriptionResult.message}`
      );
    }

    const sub = subscriptionResult.subscription;

    // Step 4: Lookup plan price from Firestore
    const planSnap = await db.collection("plans").doc(planId).get();
    const planData = planSnap.exists ? planSnap.data() : undefined;
    const planPrice = (planData as any)?.price ?? 0;

    // Step 5: Update Firestore
    const companyRef = db.collection("companies").doc(companyId);
    await companyRef.update({
      billing: {
        plan: planId,
        price: planPrice,
        braintreeCustomerId,
        subscriptionId: sub.id,
        paymentStatus: "active",
        renewalDate: admin.firestore.Timestamp.fromDate(
          new Date(sub.nextBillingDate)
        ),
        lastPaymentDate: admin.firestore.Timestamp.now(),
      },
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // ➕ sync limits right after billing update
    await syncPlanLimits(companyId, planId);

    console.log(`✅ Subscription created successfully for ${companyId}`);

    return {
      subscriptionId: sub.id,
      status: sub.status,
      nextBillingDate: sub.nextBillingDate,
    };
  } catch (error: any) {
    console.error("Unhandled error in createSubscription:", error);
    throw new HttpsError("internal", error.message || "Subscription failed.");
  }
});

/* ========================================================
   3️⃣ Cancel Subscription
======================================================== */
export const cancelSubscription = onCall(async (request) => {
  const { companyId } = request.data;

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

  // Type assertion fixes the missing .success
  const cancelResult = (await gateway.subscription.cancel(
    billing.subscriptionId
  )) as unknown as braintree.ValidatedResponse<braintree.Subscription>;

  if (!cancelResult.success) {
    throw new HttpsError(
      "internal",
      cancelResult.message || "Failed to cancel subscription."
    );
  }

  await companyRef.update({
    billing: {
      ...billing,
      plan: "free",
      price: 0,
      paymentStatus: "canceled",
      renewalDate: null,
    },
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return { message: "Subscription canceled and downgraded to Free plan." };
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
  try {
    const { customerId } = request.data || {};
    const result = await gateway.clientToken.generate(
      customerId ? { customerId } : {}
    );
    return { clientToken: result.clientToken };
  } catch (err: any) {
    console.error("Error generating client token:", err);
    throw new HttpsError("internal", "Failed to generate client token.");
  }
});

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
  const billing = companySnap.data()?.billing;

  if (!billing?.subscriptionId) {
    throw new HttpsError("failed-precondition", "No active subscription.");
  }

  // ✅ Use wrapper to handle proration safely
  const result = await updateSubscriptionWithProration(billing.subscriptionId, {
    addOns: {
      add: [{ inheritedFromId: addonType, quantity }],
    },
  });

  if (!result.success) {
    throw new HttpsError("internal", result.message || "Addon update failed.");
  }

  // ✅ Reflect change in Firestore
  const addons = companySnap.data()?.addons || {};
  addons[addonType] = (addons[addonType] || 0) + quantity;

  await companyRef.update({
    addons,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  return { success: true };
});

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

export const syncAddonUsage = onDocumentUpdated(
  "companies/{companyId}",
  async (event) => {
    const after = event.data?.after?.data();
    const companyId = event.params.companyId;
    if (!after?.billing?.subscriptionId) {
      return;
    }

    // Count all active users for this company
    const userSnap = await db
      .collection("users")
      .where("companyId", "==", companyId)
      .where("status", "==", "active")
      .get();

    const activeUsers = userSnap.size;
    const planUserLimit = after.limits?.userLimit ?? 5;
    const paidAddonQty = Math.max(0, activeUsers - planUserLimit);

    const currentQty = after.addons?.extraUsers ?? 0;
    if (paidAddonQty === currentQty) {
      return;
    } // No change → skip

    console.log(
      `🔄 Syncing add-ons for ${companyId}: ${paidAddonQty} extra users`
    );

    // ✅ Update Braintree subscription with proration
    await gateway.subscription.update(after.billing.subscriptionId, {
      addOns: {
        update: [{ existingId: "extraUsers", quantity: paidAddonQty }],
      },
      prorateCharges: true, // runtime OK, cast needed
    } as any);

    // ✅ Update Firestore
    await db.collection("companies").doc(companyId).update({
      "addons.extraUsers": paidAddonQty,
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }
);
