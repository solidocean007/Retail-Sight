import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import {
  syncBillingFromSubscription,
  refreshBillingFromGateway,
} from "../billingHelpers";
import { getAddonId, AddonType } from "../addonMap";
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
      const {
        companyId,
        paymentMethodNonce,
        planId,
        addons = [],
      } = request.data;

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

      if (addons.length) {
        payload.addOns = {
          add: addons.map((a: { id: AddonType; quantity: number }) => ({
            id: getAddonId(planId, a.id),
            quantity: a.quantity ?? 1,
          })),
        };
      }

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

export const updateSubscriptionWithProration = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async (request) => {
    const { companyId, newPlanId, addons = [] } = request.data;

    if (!companyId || !newPlanId) {
      throw new HttpsError("invalid-argument", "Missing args.");
    }

    await assertCompanyBillingAdmin(request.auth, companyId);

    const snap = await admin.firestore().doc(`companies/${companyId}`).get();
    const subscriptionId = snap.data()?.billing?.subscriptionId;
    if (!subscriptionId) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }
    const gateway = getBraintreeGateway();
    await gateway.subscription.update(subscriptionId, {
      planId: newPlanId,
      prorateCharges: true,
      addOns: { remove: ["*"] },
    } as any);

    if (addons.length) {
      await gateway.subscription.update(subscriptionId, {
        addOns: {
          add: addons.map((a: any) => ({
            inheritedFromId: getAddonId(newPlanId, a.id),
            quantity: a.quantity ?? 1,
          })),
        },
        prorateCharges: true,
      } as any);
    }

    return refreshBillingFromGateway(companyId, subscriptionId);
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
      prorateCharges: true,
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
    const { companyId, addonType, quantity } = request.data;

    await assertCompanyBillingAdmin(request.auth, companyId);

    const companyRef = admin.firestore().doc(`companies/${companyId}`);
    const snap = await companyRef.get();
    const billing = snap.data()?.billing;

    if (!billing?.subscriptionId || !billing?.plan) {
      throw new HttpsError("failed-precondition", "No active subscription.");
    }

    await companyRef.update({
      "billing.pendingAddonRemoval": {
        addonType,
        quantity,
        removeAt: billing.renewalDate ?? null,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
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

    const snap = await admin.firestore().doc(`companies/${companyId}`).get();
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
