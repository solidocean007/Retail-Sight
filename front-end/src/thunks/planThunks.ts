import { createAsyncThunk } from "@reduxjs/toolkit";
import { setAllPlans } from "../Slices/planSlice";
import { PlanType } from "../utils/types";
import { fetchBillingCatalog } from "../utils/billing/planCatalog";
import { RootState } from "../utils/store";

/**
 * Loads the plans this company is allowed to see, via the server-owned
 * `getAvailableBillingPlans` callable (family-filtered, sanitized) instead of
 * reading the raw `plans` collection from the client.
 *
 * The store is keyed by BOTH the Firestore plan doc id and the Braintree plan
 * id (when they differ) so existing consumers that look up by
 * `billing.plan` / `pendingChange.nextPlanId` keep working. The company's own
 * current plan is always included, even when it is legacy or non-self-serve
 * (e.g. healy_plan), so usage/downgrade banners can render continuity.
 */
export const fetchAllPlans = createAsyncThunk(
  "plans/fetchAll",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const companyId =
      state.currentCompany?.data?.id ?? state.user?.currentUser?.companyId;

    if (!companyId) return {};

    const catalog = await fetchBillingCatalog(companyId);

    const plans: Record<string, PlanType> = {};
    const put = (key: string | null | undefined, plan: PlanType) => {
      if (key) plans[key] = plan;
    };

    for (const p of catalog.plans) {
      const entry: PlanType = {
        braintreePlanId: p.braintreePlanId,
        price: p.price,
        userLimit: p.userLimit,
        connectionLimit: p.connectionLimit,
        family: p.family,
        selfServe: true,
        sortOrder: p.sortOrder,
        active: true,
        description: p.description,
      };
      put(p.planDocId, entry);
      if (p.braintreePlanId !== p.planDocId) put(p.braintreePlanId, entry);
    }

    const c = catalog.currentPlan;
    if (c && !plans[c.braintreePlanId]) {
      const entry: PlanType = {
        braintreePlanId: c.braintreePlanId,
        price: c.price ?? 0,
        userLimit: c.userLimit ?? 0,
        connectionLimit: c.connectionLimit ?? 0,
        family: c.family ?? undefined,
        selfServe: c.selfServe,
        active: c.active,
      };
      put(c.braintreePlanId, entry);
      put(c.planDocId, entry);
    }

    dispatch(setAllPlans(plans));
    return plans;
  }
);
