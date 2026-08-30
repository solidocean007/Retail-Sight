import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertCompanyMember } from "../billingAuth";
import { resolvePlanDocId } from "../planResolution";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type CatalogPlan = {
  planDocId: string;
  braintreePlanId: string;
  price: number;
  userLimit: number;
  connectionLimit: number;
  description: string;
  sortOrder: number;
  family: string;
};

type CurrentPlanSummary = {
  planDocId: string | null;
  braintreePlanId: string;
  price: number | null;
  userLimit: number | null;
  connectionLimit: number | null;
  family: string | null;
  selfServe: boolean;
  active: boolean;
};

/**
 * Server-owned billing catalog (see billing-family-catalog-ui-redesign-prompts.md).
 *
 * Returns ONLY what the caller's company is allowed to see:
 * - `plans`: sanitized, active, self-serve plans matching the company's
 *   pricing family (companyType) — never test/healy/custom/inactive plans and
 *   never another company's contract;
 * - `currentPlan`: the company's own current-plan summary, returned separately
 *   so a legacy, inactive, cross-family, or custom-contract plan can still
 *   render as "current" without ever entering the purchasable catalog;
 * - `family`: the company's pricing family, or null when companyType is
 *   missing/unsupported — the client must fail closed in that case.
 *
 * Any authenticated member of the company may read this (billing admins are
 * still required for every mutation).
 */
export const getAvailableBillingPlans = onCall(async (request) => {
  const { companyId } = request.data || {};
  if (!companyId) {
    throw new HttpsError("invalid-argument", "Missing companyId.");
  }

  await assertCompanyMember(request.auth, companyId);

  const companySnap = await db.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    throw new HttpsError("not-found", "Company not found.");
  }
  const company = companySnap.data() || {};

  const companyType = company.companyType;
  const family =
    companyType === "distributor" || companyType === "supplier"
      ? companyType
      : null;

  // ---- Sellable catalog for this family --------------------------------
  const plans: CatalogPlan[] = [];
  if (family) {
    const snap = await db
      .collection("plans")
      .where("selfServe", "==", true)
      .where("family", "==", family)
      .get();

    snap.forEach((doc) => {
      const p = doc.data();
      if (p?.active !== true) return;
      if (p?.braintreePlanId === "custom_contract") return;
      plans.push({
        planDocId: doc.id,
        braintreePlanId:
          typeof p?.braintreePlanId === "string" ? p.braintreePlanId : "",
        price: Number(p?.price ?? 0),
        userLimit: Number(p?.userLimit ?? 0),
        connectionLimit: Number(p?.connectionLimit ?? 0),
        description: typeof p?.description === "string" ? p.description : "",
        sortOrder: Number.isFinite(p?.sortOrder) ? p.sortOrder : 999,
        family,
      });
    });

    plans.sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price);
  }

  // ---- Current-plan summary (own company only) -------------------------
  const billing = company.billing || {};
  const currentBraintreeId: string = billing.plan || "free";

  let planDoc: any = null;
  const tryDoc = async (id: unknown) => {
    if (planDoc || typeof id !== "string" || !id) return;
    const snap = await db.collection("plans").doc(id).get();
    if (!snap.exists) return;
    const data = snap.data();
    // A contract doc scoped to a different company must never leak.
    if (data?.companyId && data.companyId !== companyId) return;
    const isFamilyFreePlan =
      currentBraintreeId === "free" &&
      data?.price === 0 &&
      data?.family === family;
    if (
      data?.braintreePlanId === currentBraintreeId ||
      snap.id === currentBraintreeId ||
      isFamilyFreePlan
    ) {
      planDoc = snap;
    }
  };
  await tryDoc(
    resolvePlanDocId(currentBraintreeId, billing.planDocId, companyType)
  );
  await tryDoc(currentBraintreeId);

  const planData = planDoc ? planDoc.data() : null;
  const isFreePlan = currentBraintreeId === "free";

  const currentPlan: CurrentPlanSummary = {
    planDocId: planDoc ? planDoc.id : null,
    braintreePlanId: currentBraintreeId,
    // Company-level limits (kept in sync by billing) win over catalog values
    // so grandfathered/custom limits render truthfully.
    // Free workspaces are the exception: older records predate family-specific
    // planDocIds and may carry stale distributor limits/costs.
    price: isFreePlan
      ? 0
      : (billing.totalMonthlyCost ??
        (planData ? Number(planData.price ?? 0) : null)),
    userLimit:
      isFreePlan && planData
        ? Number(planData.userLimit ?? 0)
        : (company.limits?.userLimit ??
          (planData ? Number(planData.userLimit ?? 0) : null)),
    connectionLimit:
      isFreePlan && planData
        ? Number(planData.connectionLimit ?? 0)
        : (company.limits?.connectionLimit ??
          (planData ? Number(planData.connectionLimit ?? 0) : null)),
    family: planData?.family ?? null,
    selfServe: planData?.selfServe === true,
    active: planData?.active !== false,
  };

  return { family, plans, currentPlan };
});
