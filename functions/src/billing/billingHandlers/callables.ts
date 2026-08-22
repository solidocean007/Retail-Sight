import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import {
  syncBillingFromSubscription,
  getValidBraintreePlanIds,
} from "../billingHelpers";
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

/**
 * Loads and validates a whale-deal contract doc (see "Custom contracts" in
 * pricing-model-redesign.md). Each contract is its own doc in `plans` with
 * braintreePlanId "custom_contract", a negotiated price, and the companyId
 * it was negotiated with — a company can only ever subscribe to its own
 * contract.
 */
async function loadCustomContractPlan(companyId: string, planDocId: string) {
  const snap = await admin.firestore().doc(`plans/${planDocId}`).get();
  const plan = snap.data();

  if (!snap.exists || plan?.braintreePlanId !== "custom_contract") {
    throw new HttpsError("invalid-argument", "Invalid custom contract plan.");
  }
  if (plan?.companyId !== companyId) {
    throw new HttpsError(
      "permission-denied",
      "This custom contract belongs to a different company."
    );
  }
  if (plan?.active === false) {
    throw new HttpsError("failed-precondition", "Custom contract not active.");
  }

  const price = Number(plan?.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "Custom contract has no valid price."
    );
  }

  return { price };
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
    try {
      console.log("=== getClientToken START ===");

      const { companyId } = request.data || {};
      console.log("companyId:", companyId);

      if (!companyId) {
        throw new HttpsError("invalid-argument", "Missing companyId.");
      }

      console.log("auth uid:", request.auth?.uid);

      await assertCompanyBillingAdmin(request.auth, companyId);
      console.log("auth check passed");

      const snap = await admin.firestore().doc(`companies/${companyId}`).get();
      console.log("company exists:", snap.exists);

      const customerId = snap.data()?.billing?.braintreeCustomerId;
      console.log("braintree customerId:", customerId);

      const gateway = getBraintreeGateway(); // maybe this isnt working??
      console.log("gateway created", gateway);

      console.log("calling clientToken.generate...");

      // Try this simplified version for new customers
      const result = await gateway.clientToken.generate({});

      console.log("clientToken success");

      return { clientToken: result.clientToken };
    } catch (err: any) {
      // Braintree errors often hide details in 'type' or 'name'
      console.error("BRAINTREE DETAIL:", {
        name: err.name,
        type: err.type,
        message: err.message,
      });

      throw new HttpsError(
        "internal",
        err.message || "Failed to generate client token"
      );
    }
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
      const { companyId, paymentMethodNonce, planId, planDocId } = request.data;
      if (planId === "free") {
        throw new HttpsError(
          "failed-precondition",
          "Free plan does not require subscription creation."
        );
      }

      // Sellable plans come from the `plans` catalog (selfServe == true),
      // with the legacy hardcoded ids as fallback. Custom contracts are
      // validated separately below against their own contract doc.
      const validPlanIds = await getValidBraintreePlanIds();

      if (planId !== "custom_contract" && !validPlanIds.has(planId)) {
        throw new HttpsError(
          "invalid-argument",
          `Invalid planId "${planId}". Must be a Braintree plan ID.`
        );
      }

      if (!companyId || !paymentMethodNonce || !planId) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
      }

      await assertCompanyBillingAdmin(request.auth, companyId);

      let customPrice: number | null = null;
      if (planId === "custom_contract") {
        if (!planDocId) {
          throw new HttpsError(
            "invalid-argument",
            "Custom contracts require planDocId."
          );
        }
        customPrice = (await loadCustomContractPlan(companyId, planDocId))
          .price;
      }

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
        if (!res.success || !res.customer?.id) {
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

      if (billing?.subscriptionId) {
        throw new HttpsError(
          "failed-precondition",
          "Subscription already exists."
        );
      }

      // Build subscription payload
      const payload: any = {
        paymentMethodToken: pmRes.paymentMethod.token,
        planId,
      };

      // Whale deals: one shared Braintree plan, price overridden per
      // contract at subscription creation (no add-ons, no proration).
      if (customPrice !== null) {
        payload.price = customPrice.toFixed(2);
      }

      const subRes = await gateway.subscription.create(payload);

      if (!subRes.success) {
        console.error("Braintree subscription error:", subRes);
        throw new HttpsError(
          "internal",
          subRes.message || "Subscription creation failed."
        );
      }

      return syncBillingFromSubscription(
        companyId,
        subRes.subscription,
        planDocId
      );
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
    const { companyId, newPlanId, planDocId } = request.data;

    const validPlanIds = await getValidBraintreePlanIds();
    if (newPlanId !== "custom_contract" && !validPlanIds.has(newPlanId)) {
      throw new HttpsError("invalid-argument", "Invalid plan.");
    }

    if (!companyId || !newPlanId) {
      throw new HttpsError("invalid-argument", "Missing args.");
    }

    await assertCompanyBillingAdmin(request.auth, companyId);

    let customPrice: number | null = null;
    if (newPlanId === "custom_contract") {
      if (!planDocId) {
        throw new HttpsError(
          "invalid-argument",
          "Custom contracts require planDocId."
        );
      }
      customPrice = (await loadCustomContractPlan(companyId, planDocId)).price;
    }

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

      // Same plan → nothing to do. Exception: custom_contract → a different
      // custom_contract doc is a real change (renegotiated deal), so only
      // short-circuit when the assigned contract doc is also unchanged.
      if (
        billing.plan === newPlanId &&
        (newPlanId !== "custom_contract" || billing.planDocId === planDocId)
      ) {
        return { success: true, alreadyApplied: true };
      }

      const gateway = getBraintreeGateway();

      const oldSub = await gateway.subscription.find(billing.subscriptionId);

      const customer = await gateway.customer.find(billing.braintreeCustomerId);

      const paymentMethodToken =
        customer.paymentMethods?.find((pm: any) => pm.default)?.token ||
        customer.paymentMethods?.[0]?.token;

      if (!paymentMethodToken) {
        throw new HttpsError(
          "failed-precondition",
          "No valid payment method on file."
        );
      }

      const payload: any = {
        paymentMethodToken,
        planId: newPlanId,
      };
      if (customPrice !== null) {
        payload.price = customPrice.toFixed(2);
      }

      const res = await gateway.subscription.create(payload);

      if (!res.success || !res.subscription) {
        throw new HttpsError("internal", res.message);
      }

      newSub = res.subscription;

      // 🔒 Single authoritative sync
      await syncBillingFromSubscription(companyId, newSub, planDocId);

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

    if (!billing?.subscriptionId) {
      throw new HttpsError("failed-precondition", "No subscription.");
    }

    const gateway = getBraintreeGateway();

    // Cancel in Braintree
    await gateway.subscription.cancel(billing.subscriptionId);

    // Fetch fresh state
    const canceled = await gateway.subscription.find(billing.subscriptionId);

    // Canonical sync
    return await syncBillingFromSubscription(companyId, canceled);
  }
);

export const scheduleBillingDowngrade = onCall(async (request) => {
  const { companyId, nextPlanId } = request.data;

  if (!companyId || !nextPlanId) {
    throw new HttpsError("invalid-argument", "Missing args.");
  }

  // Downgrade targets: free, or any catalog plan. Custom contracts are not
  // schedulable here — those are renegotiated through the custom flow.
  const paidPlans = await getValidBraintreePlanIds();

  if (nextPlanId !== "free" && !paidPlans.has(nextPlanId)) {
    throw new HttpsError("invalid-argument", "Invalid plan.");
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
