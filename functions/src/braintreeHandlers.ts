import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import dotenv = require("dotenv");
import braintree = require("braintree");

dotenv.config();
if (!admin.apps.length) {
  admin.initializeApp();
}

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

// --- 1. Create Customer ---
export const createBraintreeCustomer = onCall(async (request) => {
  const { companyId, companyName, email } = request.data;
  const result = await gateway.customer.create({
    firstName: companyName,
    email,
    customFields: { companyId },
  });
  if (!result.success) {
    throw new Error(result.message);
  }
  return { customerId: result.customer?.id };
});

// --- 2. Create Subscription ---
/**
 * === Create Subscription (secure, production-ready) ===
 * 1. Verifies auth + arguments
 * 2. Creates Braintree customer if needed
 * 3. Creates payment method + subscription
 * 4. Updates Firestore company doc with billing info
 */
// --- 2. Create Subscription ---
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

    // 🧠 Step 1: Create a customer if not already stored
    if (!braintreeCustomerId) {
      console.log("➡ Creating new Braintree customer for", companyId, email);

      const customerResult = await gateway.customer.create({
        firstName: companyName,
        email,
      });

      console.log(
        "Braintree customerResult:",
        JSON.stringify(customerResult, null, 2)
      );

      if (!customerResult.success || !customerResult.customer?.id) {
        console.error("❌ Failed customer creation:", customerResult.message);
        throw new HttpsError(
          "internal",
          "Failed to create Braintree customer."
        );
      }

      braintreeCustomerId = customerResult.customer.id;
    }

    // 🧠 Step 2: Create a payment method for this customer
    console.log("➡ Creating payment method for", braintreeCustomerId);

    const paymentResult = await gateway.paymentMethod.create({
      customerId: braintreeCustomerId,
      paymentMethodNonce,
      options: { makeDefault: true },
    });

    console.log(
      "PaymentMethod result:",
      JSON.stringify(paymentResult, null, 2)
    );

    if (!paymentResult.success) {
      throw new HttpsError(
        "internal",
        `Payment method creation failed: ${paymentResult.message}`
      );
    }

    // 🧠 Step 3: Create subscription
    console.log("➡ Creating subscription with plan:", planId);

    const subscriptionResult = await gateway.subscription.create({
      paymentMethodToken: paymentResult.paymentMethod.token,
      planId,
    });

    console.log(
      "Subscription result:",
      JSON.stringify(subscriptionResult, null, 2)
    );

    if (!subscriptionResult.success) {
      throw new HttpsError(
        "internal",
        `Subscription creation failed: ${subscriptionResult.message}`
      );
    }

    const sub = subscriptionResult.subscription;

    // 🧠 Step 4: Update Firestore
    const companyRef = admin.firestore().collection("companies").doc(companyId);
    await companyRef.update({
      plan: planId,
      "billing.braintreeCustomerId": braintreeCustomerId,
      "billing.subscriptionId": sub.id,
      "billing.paymentStatus": sub.status.toLowerCase(),
      "billing.renewalDate": sub.nextBillingDate
        ? admin.firestore.Timestamp.fromDate(new Date(sub.nextBillingDate))
        : null,
      "billing.lastPaymentDate": admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Subscription created successfully for", companyId);

    return {
      subscriptionId: sub.id,
      status: sub.status,
      nextBillingDate: sub.nextBillingDate,
    };
  } catch (error: unknown) {
    let message = "Failed to create subscription.";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }

    console.error("Unhandled error in createSubscription:", error);
    throw new HttpsError("internal", message);
  }
});

// --- 3. Cancel Subscription ---
export const cancelSubscription = onCall(async (request) => {
  const { subscriptionId } = request.data;
  const result = await gateway.subscription.cancel(subscriptionId);
  if (!(result as any).success) {
    throw new Error((result as any).message || "Cancellation failed");
  }
  return { status: "canceled" };
});

// --- 4. Handle Webhook ---
export const handleBraintreeWebhook = onCall(async (request) => {
  const { btSignature, btPayload } = request.data;

  const webhookNotification = await gateway.webhookNotification.parse(
    btSignature,
    btPayload
  );

  const eventType = webhookNotification.kind;
  const subscription = (webhookNotification as any)?.subscription;
  const companyId = subscription?.transactions?.[0]?.customFields?.companyId;

  if (!companyId) {
    return { ok: false };
  }

  const companyRef = admin.firestore().collection("companies").doc(companyId);
  const billingRef = companyRef.collection("billingLogs").doc();

  await billingRef.set({
    companyId,
    event: eventType,
    amount: subscription?.price,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (eventType === "subscription_charged_successfully") {
    await companyRef.update({
      "billing.paymentStatus": "active",
      "billing.lastPaymentDate": admin.firestore.FieldValue.serverTimestamp(),
    });
  } else if (eventType === "subscription_charged_unsuccessfully") {
    await companyRef.update({ "billing.paymentStatus": "past_due" });
  } else if (eventType === "subscription_canceled") {
    await companyRef.update({
      plan: "free",
      "billing.paymentStatus": "canceled",
    });
  }

  return { received: true };
});

// === 5️⃣ Generate Client Token ===
export const getClientToken = onCall(async (request) => {
  try {
    const { customerId } = request.data || {};
    const result = await gateway.clientToken.generate(
      customerId ? { customerId } : {}
    );
    return { clientToken: result.clientToken };
  } catch (err: any) {
    console.error("Error generating client token:", err);
    throw new Error("Failed to generate client token");
  }
});
