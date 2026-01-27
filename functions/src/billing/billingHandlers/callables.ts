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

    if (billing?.pendingPlanChangeInProgress) {
      throw new HttpsError(
        "failed-precondition",
        "Plan change already in progress."
      );
    }

    await companyRef.update({
      "billing.pendingPlanChangeInProgress": true,
    });

    let newSub: any;

    try {
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
        return { success: true, alreadyApplied: true };
      }

      const gateway = getBraintreeGateway();

      const oldSub = await gateway.subscription.find(billing.subscriptionId);

      const customer = await gateway.customer.find(billing.braintreeCustomerId);

      const paymentMethodToken = customer.paymentMethods?.[0]?.token;

      if (!paymentMethodToken) {
        throw new HttpsError(
          "failed-precondition",
          "No valid payment method on file."
        );
      }

      const res = await gateway.subscription.create({
        paymentMethodToken,
        planId: newPlanId,
      });

      if (!res.success || !res.subscription) {
        throw new HttpsError("internal", res.message);
      }

      newSub = res.subscription;

      // 🔒 Single authoritative sync
      await syncBillingFromSubscription(companyId, newSub);

      // Optional cleanup (non-fatal)
      try {
        const removeAllAddons = newSub.addOns?.map((a: any) => a.id) ?? [];
        if (removeAllAddons.length) {
          await gateway.subscription.update(newSub.id, {
            addOns: { remove: removeAllAddons },
            prorateCharges: false,
          } as any);
        }
        console.log(newSub);
      } catch (err) {
        console.warn("⚠️ Addon cleanup failed", newSub.id);
      }

      // Cancel old subscription
      try {
        await gateway.subscription.cancel(oldSub.id);
      } catch (err) {
        console.error("⚠️ Failed to cancel old subscription", {
          oldSubId: oldSub.id,
          newSubId: newSub.id,
        });
      }

      return { success: true };
    } finally {
      // 🔓 ALWAYS clear lock
      await companyRef.update({
        "billing.pendingPlanChangeInProgress":
          admin.firestore.FieldValue.delete(),
      });
    }
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
    console.log("🧩 addAddon: resolved mapping", {
      companyId,
      plan: billing.plan,
      addonType,
      resolvedAddonId: addonId,
      quantity,
      subscriptionId: billing.subscriptionId,
    });

    const gateway = getBraintreeGateway();
    const subscription = await gateway.subscription.find(
      billing.subscriptionId
    );
    console.log("subscription: ", subscription);

    const existingAddon = subscription.addOns?.find((a) => a.id === addonId);
    const addOnParams: any = {};

    if (existingAddon) {
      // Update: We add the new quantity to what they already have
      addOnParams.update = [
        {
          existingId: addonId,
          quantity: Number(existingAddon.quantity) + Number(quantity),
        },
      ];
    } else {
      // Add: Brand new addition to the subscription
      addOnParams.add = [
        {
          inheritedFromId: addonId,
          quantity: Number(quantity),
        },
      ];
    }

    const result = await gateway.subscription.update(billing.subscriptionId, {
      merchantAccountId: "displaygram",
      addOns: addOnParams,
      prorateCharges: false,
    } as any);

    // const result = await gateway.subscription.update(billing.subscriptionId, {
    //   merchantAccountId: "displaygram",
    //   addOns: {
    //     add: [{ inheritedFromId: addonId, quantity: quantity }],
    //   },
    //   prorateCharges: false,
    // } as any);

    if (!result.success) {
      throw new HttpsError("internal", "Add-on failed.");
    }
    console.log("💳 addAddon: braintree update result", {
      success: result.success,
      subscriptionId: result.subscription?.id,
      addOns: result.subscription?.addOns?.map((a: any) => ({
        id: a.id,
        quantity: a.quantity,
      })),
    });

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
