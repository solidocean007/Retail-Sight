/**
 * Seed / upgrade the `plans` collection for the two-family pricing model.
 *
 * Plan of record: pricing-model-redesign.md (repo root). This script:
 *
 *   1. Creates the NEW plan docs (dist_max, supplier_free, supplier_starter,
 *      supplier_growth, supplier_network, supplier_national) with full data.
 *   2. Adds the new catalog metadata fields (family, selfServe, sortOrder,
 *      active) to EXISTING plan docs (free, starter, team, pro, enterprise,
 *      healy_plan, test) WITHOUT touching their price/userLimit/
 *      connectionLimit — live billing reads those and this script must be
 *      safe to run against production.
 *
 * Idempotent: re-running produces no changes once everything matches.
 * Existing docs' price/limits are NEVER overwritten. New docs are only
 * created if missing; if a "new" doc already exists, only the metadata
 * fields are merged.
 *
 * Usage (from the functions/ directory):
 *
 *   node scripts/seedPlans.js             # dry run — prints what would change
 *   node scripts/seedPlans.js --commit    # write
 *
 * Credentials: needs Admin SDK access, which the firebase CLI login does NOT
 * provide. Either run `gcloud auth application-default login` first, or set
 * GOOGLE_APPLICATION_CREDENTIALS to a service-account key path.
 *
 * NOTE: doc id == Braintree plan id for all self-serve plans (getPlanDetails
 * reads by doc id; syncBillingFromSubscription queries by braintreePlanId).
 * Free tiers have no Braintree subscription, so their braintreePlanId is "".
 * custom_contract deliberately has NO doc here — each whale contract gets its
 * own per-contract doc later (see "Custom contracts" in the design doc).
 */

const admin = require("firebase-admin");

const PROJECT_ID = "retail-sight";

const args = process.argv.slice(2);
const commit = args.includes("--commit");

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Catalog definition
// ---------------------------------------------------------------------------

/** New docs: created with ALL fields if the doc doesn't exist yet. */
const NEW_PLANS = {
  dist_max: {
    braintreePlanId: "dist_max",
    price: 299,
    userLimit: 1000,
    connectionLimit: 60,
    family: "distributor",
    selfServe: true,
    sortOrder: 6,
    active: true,
    description: "For the largest distributor teams.",
  },
  supplier_free: {
    braintreePlanId: "",
    price: 0,
    userLimit: 5,
    connectionLimit: 1,
    family: "supplier",
    selfServe: true,
    sortOrder: 1,
    active: true,
    description: "Connect with one distributor and see Displaygram in action.",
  },
  supplier_starter: {
    braintreePlanId: "supplier_starter",
    price: 29,
    userLimit: 15,
    connectionLimit: 10,
    family: "supplier",
    selfServe: true,
    sortOrder: 2,
    active: true,
    description: "For suppliers building their first distributor network.",
  },
  supplier_growth: {
    braintreePlanId: "supplier_growth",
    price: 79,
    userLimit: 50,
    connectionLimit: 50,
    family: "supplier",
    selfServe: true,
    sortOrder: 3,
    active: true,
    description: "For regional suppliers with a growing network.",
  },
  supplier_network: {
    braintreePlanId: "supplier_network",
    price: 149,
    userLimit: 100,
    connectionLimit: 150,
    family: "supplier",
    selfServe: true,
    sortOrder: 4,
    active: true,
    description: "For multi-state supplier networks.",
  },
  supplier_national: {
    braintreePlanId: "supplier_national",
    price: 299,
    userLimit: 150,
    connectionLimit: 500,
    family: "supplier",
    selfServe: true,
    sortOrder: 5,
    active: true,
    description: "For national suppliers with hundreds of distributors.",
  },
};

/**
 * Existing docs: ONLY these metadata fields are merged. price/userLimit/
 * connectionLimit are intentionally absent so they can never be changed here.
 * Docs listed here that don't exist in Firestore are reported and skipped
 * (never created — their price/limits are unknown to this script).
 */
const EXISTING_PLAN_METADATA = {
  free: { family: "distributor", selfServe: true, sortOrder: 1, active: true },
  starter: {
    family: "distributor",
    selfServe: true,
    sortOrder: 2,
    active: true,
  },
  team: { family: "distributor", selfServe: true, sortOrder: 3, active: true },
  pro: { family: "distributor", selfServe: true, sortOrder: 4, active: true },
  enterprise: {
    family: "distributor",
    selfServe: true,
    sortOrder: 5,
    active: true,
  },
  // Legacy hardcoded custom deal — stays valid, but never shown in catalogs.
  healy_plan: {
    family: "distributor",
    selfServe: false,
    sortOrder: 99,
    active: true,
  },
  // Internal testing plan — never shown in catalogs.
  test: { family: "distributor", selfServe: false, sortOrder: 98, active: true },
};

// ---------------------------------------------------------------------------

function diffFields(current, desired) {
  const changes = {};
  for (const [key, value] of Object.entries(desired)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(value)) {
      changes[key] = value;
    }
  }
  return changes;
}

async function main() {
  console.log(
    `Seeding plans catalog (${commit ? "COMMIT" : "dry run"}) — project ${PROJECT_ID}\n`
  );

  let writes = 0;

  // 1. New plan docs
  for (const [id, data] of Object.entries(NEW_PLANS)) {
    const ref = db.collection("plans").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`CREATE plans/${id}:`, JSON.stringify(data));
      writes++;
      if (commit) await ref.set(data);
      continue;
    }

    // Doc already exists (e.g. re-run, or created by hand): merge metadata
    // only, leave price/limits alone like an existing doc.
    const { family, selfServe, sortOrder, active } = data;
    const changes = diffFields(snap.data(), {
      family,
      selfServe,
      sortOrder,
      active,
    });
    if (Object.keys(changes).length === 0) {
      console.log(`ok     plans/${id} (exists, up to date)`);
      continue;
    }
    console.log(`MERGE  plans/${id}:`, JSON.stringify(changes));
    writes++;
    if (commit) await ref.set(changes, { merge: true });
  }

  // 2. Metadata on existing docs
  for (const [id, meta] of Object.entries(EXISTING_PLAN_METADATA)) {
    const ref = db.collection("plans").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`skip   plans/${id} — doc not found (not created by design)`);
      continue;
    }

    const changes = diffFields(snap.data(), meta);
    if (Object.keys(changes).length === 0) {
      console.log(`ok     plans/${id} (up to date)`);
      continue;
    }
    console.log(`MERGE  plans/${id}:`, JSON.stringify(changes));
    writes++;
    if (commit) await ref.set(changes, { merge: true });
  }

  console.log(
    `\n${commit ? "Wrote" : "Would write"} ${writes} doc(s).` +
      (commit ? "" : " Re-run with --commit to apply.")
  );
}

main().catch((err) => {
  console.error("seedPlans failed:", err);
  process.exit(1);
});
