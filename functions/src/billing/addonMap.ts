// functions/src/billing/addonMap.ts

export type AddonType = "extraUser" | "extraConnection";
export type PlanId = "free" | "team" | "network";

/**
 * Canonical mapping:
 * Firestore addon key → Braintree inheritedFromId
 *
 * 🔒 RULES:
 * - Keys MUST match Firestore billing.addons keys
 * - Values MUST match Braintree add-on IDs exactly
 * - No dynamic string building elsewhere in the codebase
 */
export const ADDON_IDS: Record<PlanId, Record<AddonType, string>> = {
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
 * Safe resolver used by handlers/helpers.
 * Throws early if mapping is invalid instead of silently billing wrong.
 */
export function getAddonId(planId: string, addonType: AddonType): string {
  const plan = planId as PlanId;
  const addonId = ADDON_IDS[plan]?.[addonType];

  if (!addonId) {
    throw new Error(
      `Invalid add-on mapping: plan="${planId}", addon="${addonType}"`
    );
  }

  return addonId;
}

/**
 * Maps a billing add-on ID (e.g. from Braintree or internal billing config)
 * to a normalized internal AddonType.
 *
 * This helper allows the billing system to stay flexible:
 * - External providers may use verbose or versioned add-on IDs
 * - Internal logic relies on a strict union type
 *
 * The match is case-insensitive and based on substring detection.
 *
 * @param addonId - The raw add-on identifier from the billing provider
 * @returns The normalized AddonType (`"extraUser"` | `"extraConnection"`)
 *          or `null` if the add-on is not recognized
 *
 * @example
 * addonIdToAddonType("displaygram_extraUser_v1")
 * // → "extraUser"
 *
 * @example
 * addonIdToAddonType("EXTRA_CONNECTION")
 * // → "extraConnection"
 *
 * @example
 * addonIdToAddonType("unknown-addon")
 * // → null
 */
export function addonIdToAddonType(addonId: string): AddonType | null {
  const id = addonId.toLowerCase();

  if (id.includes("extrauser")) return "extraUser";
  if (id.includes("extraconnection")) return "extraConnection";

  return null;
}
