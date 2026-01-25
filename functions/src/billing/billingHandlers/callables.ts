import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import { syncBillingFromSubscription } from "../billingHelpers";
import { getAddonId } from "../addonMap";
import { assertCompanyBillingAdmin } from "../billingAuth";
import {
  BRAINTREE_ENVIRONMENT,
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_PRIVATE_KEY,
  BRAINTREE_PUBLIC_KEY,
} from "../braintreeSecrets";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const getClientToken = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId } = request.data || {};
    if (!companyId) {
      throw new HttpsError("invalid-argument", "Missing companyId.");
    }

    await assertCompanyBillingAdmin(request.auth, companyId);

    const snap = await admin.firestore().doc(`companies/${companyId}`).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Company not found.");
    }

    const customerId = snap.data()?.billing?.braintreeCustomerId;
    const gateway = getBraintreeGateway();
    const result = await gateway.clientToken.generate(
      customerId ? { customerId } : {}
    );

    return { clientToken: result.clientToken };
  }
);

export const createSubscription = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    try {
      const { companyId, paymentMethodNonce, planId } = request.data;
      if (planId === "free") {
        throw new HttpsError(
          "failed-precondition",
          "Free plan does not require subscription creation."
        );
      }

      const validPlanIds = [
        "free",
        "team",
        "network",
        "enterprise",
        "healy_plan",
      ];

      if (!validPlanIds.includes(planId)) {
        throw new HttpsError(
          "invalid-argument",
          `Invalid planId "${planId}". Must be a Braintree plan ID.`
        );
      }

      if (!companyId || !paymentMethodNonce || !planId) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
      }

      await assertCompanyBillingAdmin(request.auth, companyId);

      const companyRef = admin.firestore().doc(`companies/${companyId}`);
      const snap = await companyRef.get();
      if (!snap.exists) {
        throw new HttpsError("not-found", "Company not found.");
      }

      const billing = snap.data()?.billing || {};
      const gateway = getBraintreeGateway();

      // Ensure customer exists
      let customerId = billing.braintreeCustomerId;
      if (!customerId) {
        const res = await gateway.customer.create({
          company: snap.data()?.name ?? companyId,
        });
        if (!res.success) {
          throw new HttpsError("internal", "Failed to create customer.");
        }
        customerId = res.customer.id;
        await companyRef.update({
          "billing.braintreeCustomerId": customerId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Vault payment method
      const pmRes = await gateway.paymentMethod.create({
        customerId,
        paymentMethodNonce,
        options: { makeDefault: true },
      });

      if (!pmRes.success) {
        console.error("Payment method error:", pmRes);
        throw new HttpsError("internal", "Payment method failed.");
      }

      // Build subscription payload
      const payload: any = {
        paymentMethodToken: pmRes.paymentMethod.token,
        planId,
      };

      const subRes = await gateway.subscription.create(payload);

      if (!subRes.success) {
        console.error("Braintree subscription error:", subRes);
        throw new HttpsError(
          "internal",
          subRes.message || "Subscription creation failed."
        );
      }

      return syncBillingFromSubscription(companyId, subRes.subscription);
    } catch (err: any) {
      console.error("createSubscription failed:", err);
      throw err instanceof HttpsError
        ? err
        : new HttpsError(
            "internal",
            err.message || "Subscription creation failed"
          );
    }
  }
);

export const changePlanAndRestartBillingCycle = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId, newPlanId } = request.data;

    if (!companyId || !newPlanId) {
      throw new HttpsError("invalid-argument", "Missing args.");
    }

    await assertCompanyBillingAdmin(request.auth, companyId);

    const companyRef = admin.firestore().doc(`companies/${companyId}`);
    const snap = await companyRef.get();
    const billing = snap.data()?.billing;

    if (billing?.pendingChange) {
      throw new HttpsError(
        "failed-precondition",
        "You have a downgrade scheduled. Cancel it before upgrading."
      );
    }

    if (!billing?.subscriptionId || !billing?.braintreeCustomerId) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }

    if (billing.plan === newPlanId) {
      throw new HttpsError("failed-precondition", "Already on this plan.");
    }

    const gateway = getBraintreeGateway();

    // 1️⃣ Fetch existing subscription (source of truth)
    const oldSub = await gateway.subscription.find(billing.subscriptionId);

    // 2️⃣ Create NEW subscription (starts new billing cycle)
    // ⚠️ IMPORTANT:
    // Braintree applies default addon quantities on subscription creation.
    // We MUST explicitly set addon quantities to avoid ghost charges.

    let newSub;
    try {
      const res = await gateway.subscription.create({
        paymentMethodToken: oldSub.paymentMethodToken,
        planId: newPlanId,
      });

      if (!res.success) {
        throw new Error(res.message);
      }

      newSub = res.subscription;
    } catch (err) {
      console.error("❌ New subscription creation failed", err);
      throw new HttpsError(
        "internal",
        "Plan change failed. No charges were made."
      );
    }
    // 3️⃣ Cancel OLD subscription AFTER new one exists
    try {
      await gateway.subscription.cancel(oldSub.id);
    } catch (err) {
      // Non-fatal, but must be logged for cleanup
      console.error("⚠️ Failed to cancel old subscription", {
        companyId,
        oldSubId: oldSub.id,
        newSubId: newSub.id,
      });
    }

    // 4️⃣ Sync Firestore from NEW subscription
    await syncBillingFromSubscription(companyId, newSub);

    return { success: true };
  }
);

export const addAddon = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId, addonType, quantity = 1 } = request.data;

    await assertCompanyBillingAdmin(request.auth, companyId);

    const snap = await admin.firestore().doc(`companies/${companyId}`).get();
    const billing = snap.data()?.billing;

    if (!billing?.subscriptionId || !billing?.plan) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }

    const addonId = getAddonId(billing.plan, addonType);
    const gateway = getBraintreeGateway();
    const result = await gateway.subscription.update(billing.subscriptionId, {
      addOns: {
        add: [{ inheritedFromId: addonId, quantity }],
      },
      prorateCharges: false,
    } as any);

    if (!result.success) {
      throw new HttpsError("internal", "Add-on failed.");
    }

    return syncBillingFromSubscription(companyId, result.subscription);
  }
);

export const removeAddon = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId, addonType, removeQty } = request.data;

    if (removeQty <= 0) {
      throw new HttpsError("invalid-argument", "removeQty must be > 0.");
    }

    await assertCompanyBillingAdmin(request.auth, companyId);

    const ref = admin.firestore().doc(`companies/${companyId}`);
    const snap = await ref.get();
    const billing = snap.data()?.billing;

    if (!billing?.subscriptionId || !billing?.plan) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }

    const currentQty = billing.addons?.[addonType] ?? 0;
    const nextQty = Math.max(0, currentQty - removeQty);

    await ref.update({
      "billing.pendingAddonRemoval": {
        addonType,
        nextQuantity: nextQty,
        effectiveAt: billing.renewalDate,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { scheduled: true };
  }
);

export const cancelSubscription = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId } = request.data;

    await assertCompanyBillingAdmin(request.auth, companyId);

    const ref = admin.firestore().doc(`companies/${companyId}`);
    const snap = await ref.get();

    const billing = snap.data()?.billing;
    if (!billing?.subscriptionId || !billing?.renewalDate) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }

    const subId = snap.data()?.billing?.subscriptionId;

    if (!subId) {
      throw new HttpsError("failed-precondition", "No subscription.");
    }
    const gateway = getBraintreeGateway();
    await gateway.subscription.cancel(subId);

    await admin.firestore().doc(`companies/${companyId}`).update({
      "billing.paymentStatus": "canceled",
      "billing.canceledAt": admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);

export const scheduleBillingDowngrade = onCall(async (request) => {
  const { companyId, nextPlanId } = request.data;

  if (!companyId || !nextPlanId) {
    throw new HttpsError("invalid-argument", "Missing args.");
  }

  await assertCompanyBillingAdmin(request.auth, companyId);

  const ref = admin.firestore().doc(`companies/${companyId}`);
  const snap = await ref.get();

  const billing = snap.data()?.billing;
  if (!billing?.subscriptionId || !billing?.renewalDate) {
    throw new HttpsError("failed-precondition", "No active subscription.");
  }

  await ref.update({
    "billing.pendingChange": {
      nextPlanId,
      effectiveAt: billing.renewalDate,
    },
  });

  return { scheduled: true };
});

export const cancelScheduledDowngrade = onCall(async (request) => {
  const { companyId } = request.data;
  await assertCompanyBillingAdmin(request.auth, companyId);

  await admin.firestore().doc(`companies/${companyId}`).update({
    "billing.pendingChange": admin.firestore.FieldValue.delete(),
  });

  return { canceled: true };
});
