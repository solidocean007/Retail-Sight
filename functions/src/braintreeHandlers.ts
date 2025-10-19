import { onCall } from "firebase-functions/v2/https";
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
export const createSubscription = onCall(async (request) => {
  const { customerId, paymentMethodNonce, planId } = request.data;

  const paymentResult = await gateway.paymentMethod.create({
    customerId,
    paymentMethodNonce,
    options: { makeDefault: true },
  });
  if (!paymentResult.success) {
    throw new Error(paymentResult.message);
  }

  const subscriptionResult = await gateway.subscription.create({
    paymentMethodToken: paymentResult.paymentMethod.token,
    planId,
  });
  if (!subscriptionResult.success) {
    throw new Error(subscriptionResult.message);
  }

  return {
    subscriptionId: subscriptionResult.subscription.id,
    status: subscriptionResult.subscription.status,
    nextBillingDate: subscriptionResult.subscription.nextBillingDate,
  };
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
