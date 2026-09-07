/**
 * Merge the newer Geloso company shell into the original Geloso company.
 *
 * This migration keeps the original company owned by Brent Surles, moves
 * Craig Ellen into it, preserves the existing Healy connection by updating
 * that connection in place, and repairs live post visibility references.
 * The duplicate company document is deliberately retained for manual review.
 *
 * Usage (from the functions/ directory):
 *
 *   node scripts/mergeGelosoCompanies.js          # dry run
 *   node scripts/mergeGelosoCompanies.js --commit # apply and verify
 */

const admin = require("firebase-admin");

const PROJECT_ID = "retail-sight";
const HEALY_COMPANY_ID = "3WOAwgj3l3bnvHqE4IV3";
const SOURCE_COMPANY_ID = "bk4WVfl9T4kfCWUdwXmS";
const TARGET_COMPANY_ID = "oL40cFJ3z2iv0neKyNDa";
const CONNECTION_ID = "P0hu11ESqTyPjdADJE5q";
const CRAIG_UID = "MLjgwZ3roXS9YHk6XXmGItAWscA3";
const BRENT_UID = "N7DR9Xmq4iUYTW4gUHlQjJhqb6q1";

const commit = process.argv.slice(2).includes("--commit");

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function replaceCompanyId(values) {
  const ids = Array.isArray(values) ? values : [];
  return Array.from(
    new Set(
      ids
        .map((id) => (id === SOURCE_COMPANY_ID ? TARGET_COMPANY_ID : id))
        .filter(Boolean)
    )
  );
}

async function loadAndValidate() {
  const refs = {
    source: db.doc(`companies/${SOURCE_COMPANY_ID}`),
    target: db.doc(`companies/${TARGET_COMPANY_ID}`),
    healy: db.doc(`companies/${HEALY_COMPANY_ID}`),
    craig: db.doc(`users/${CRAIG_UID}`),
    brent: db.doc(`users/${BRENT_UID}`),
    connection: db.doc(`companyConnections/${CONNECTION_ID}`),
  };

  const [sourceSnap, targetSnap, healySnap, craigSnap, brentSnap, connSnap] =
    await Promise.all([
      refs.source.get(),
      refs.target.get(),
      refs.healy.get(),
      refs.craig.get(),
      refs.brent.get(),
      refs.connection.get(),
    ]);

  assert(sourceSnap.exists, "Source Geloso company is missing.");
  assert(targetSnap.exists, "Target Geloso company is missing.");
  assert(healySnap.exists, "Healy company is missing.");
  assert(craigSnap.exists, "Craig user is missing.");
  assert(brentSnap.exists, "Brent user is missing.");
  assert(connSnap.exists, "Healy/Geloso connection is missing.");

  const source = sourceSnap.data();
  const target = targetSnap.data();
  const craig = craigSnap.data();
  const brent = brentSnap.data();
  const connection = connSnap.data();

  assert(
    lower(craig.email) === "craig.ellen@geloso.com",
    "Craig user email does not match the expected account."
  );
  assert(
    lower(brent.email) === "bsurles@gelosobev.com",
    "Brent user email does not match the expected account."
  );
  assert(
    [SOURCE_COMPANY_ID, TARGET_COMPANY_ID].includes(craig.companyId),
    "Craig belongs to an unexpected company."
  );
  assert(
    brent.companyId === TARGET_COMPANY_ID,
    "Brent no longer belongs to the target Geloso company."
  );
  assert(
    connection.requestFromCompanyId === HEALY_COMPANY_ID,
    "The expected connection no longer originates from Healy."
  );
  assert(
    [SOURCE_COMPANY_ID, TARGET_COMPANY_ID].includes(
      connection.requestToCompanyId
    ),
    "The expected connection points to an unexpected company."
  );
  assert(
    connection.status === "approved",
    "The Healy/Geloso connection is not approved."
  );

  const healyConnections = await db
    .collection("companyConnections")
    .where("companyIds", "array-contains", HEALY_COMPANY_ID)
    .get();

  const duplicateConnection = healyConnections.docs.find((docSnap) => {
    if (docSnap.id === CONNECTION_ID) return false;
    const companyIds = docSnap.data().companyIds;
    return Array.isArray(companyIds) && companyIds.includes(TARGET_COMPANY_ID);
  });

  assert(
    !duplicateConnection,
    `Healy already has another connection to the target Geloso company: ${
      duplicateConnection?.id || "unknown"
    }`
  );

  const otherSuperAdmins = await db
    .collection("users")
    .where("companyId", "==", TARGET_COMPANY_ID)
    .where("role", "==", "super-admin")
    .get();

  const otherSuperAdminCount = otherSuperAdmins.docs.filter(
    (docSnap) => docSnap.id !== BRENT_UID
  ).length;
  assert(
    otherSuperAdminCount < 3,
    "The target company already has the maximum number of super-admins."
  );

  const postsSharedWithSource = await db
    .collection("posts")
    .where("sharedWithCompanies", "array-contains", SOURCE_COMPANY_ID)
    .get();

  return {
    refs,
    source,
    target,
    craig,
    brent,
    connection,
    postsSharedWithSource,
    healyConnectionCount: healyConnections.size,
  };
}

async function calculateCounts(companyId) {
  const [
    activeUsers,
    pendingInvites,
    approvedInitiated,
    pendingInitiated,
    pendingDrafts,
    pendingReceived,
    allApproved,
  ] = await Promise.all([
    db
      .collection("users")
      .where("companyId", "==", companyId)
      .where("status", "==", "active")
      .get(),
    db
      .collection(`companies/${companyId}/invites`)
      .where("status", "==", "pending")
      .get(),
    db
      .collection("companyConnections")
      .where("requestFromCompanyId", "==", companyId)
      .where("status", "==", "approved")
      .get(),
    db
      .collection("companyConnections")
      .where("requestFromCompanyId", "==", companyId)
      .where("status", "==", "pending")
      .get(),
    db
      .collection("companyConnectionDrafts")
      .where("initiatorCompanyId", "==", companyId)
      .where("status", "==", "pending-user-creation")
      .get(),
    db
      .collection("companyConnections")
      .where("requestToCompanyId", "==", companyId)
      .where("status", "==", "pending")
      .get(),
    db
      .collection("companyConnections")
      .where("companyIds", "array-contains", companyId)
      .where("status", "==", "approved")
      .get(),
  ]);

  return {
    counts: {
      usersActiveTotal: activeUsers.size,
      usersPendingTotal: pendingInvites.size,
      connectionsApprovedTotal: approvedInitiated.size,
      connectionsPendingInitiatedTotal:
        pendingInitiated.size + pendingDrafts.size,
      connectionsPendingReceivedTotal: pendingReceived.size,
    },
    usage: {
      users: activeUsers.size,
      connections: allApproved.size,
    },
  };
}

async function updateClaims(uid, role, companyId) {
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    role,
    companyId,
  });
}

async function applyMigration(context) {
  const { refs, target, connection, postsSharedWithSource } = context;
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  batch.update(refs.craig, {
    companyId: TARGET_COMPANY_ID,
    role: "admin",
    status: "active",
    reportsTo: BRENT_UID,
    lastUpdated: now,
  });
  batch.update(refs.brent, {
    role: "super-admin",
    status: "active",
    lastUpdated: now,
  });
  batch.update(refs.connection, {
    requestToCompanyId: TARGET_COMPANY_ID,
    requestToCompanyName: target.companyName || "gelosobeverage",
    companyIds: [HEALY_COMPANY_ID, TARGET_COMPANY_ID],
    updatedAt: now,
  });

  const mirror = {
    connectionId: CONNECTION_ID,
    sharedBrandIds: Array.isArray(connection.sharedBrandIds)
      ? connection.sharedBrandIds
      : [],
    sharedBrandNames: Array.isArray(connection.sharedBrandNames)
      ? connection.sharedBrandNames
      : [],
    status: "approved",
    updatedAt: now,
  };

  batch.set(
    db.doc(
      `companies/${HEALY_COMPANY_ID}/companyConnections/${CONNECTION_ID}`
    ),
    mirror,
    { merge: true }
  );
  batch.set(
    db.doc(
      `companies/${TARGET_COMPANY_ID}/companyConnections/${CONNECTION_ID}`
    ),
    mirror,
    { merge: true }
  );
  batch.delete(
    db.doc(
      `companies/${SOURCE_COMPANY_ID}/companyConnections/${CONNECTION_ID}`
    )
  );

  postsSharedWithSource.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      sharedWithCompanies: replaceCompanyId(
        docSnap.data().sharedWithCompanies
      ),
    });
  });

  await batch.commit();

  await Promise.all([
    updateClaims(CRAIG_UID, "admin", TARGET_COMPANY_ID),
    updateClaims(BRENT_UID, "super-admin", TARGET_COMPANY_ID),
  ]);

  for (const companyId of [
    HEALY_COMPANY_ID,
    TARGET_COMPANY_ID,
    SOURCE_COMPANY_ID,
  ]) {
    const totals = await calculateCounts(companyId);
    await db.doc(`companies/${companyId}`).update({
      counts: totals.counts,
      usage: totals.usage,
      countsUpdatedAt: FieldValue.serverTimestamp(),
    });
  }
}

async function verify() {
  const [craigSnap, brentSnap, connectionSnap, oldPosts, newPosts] =
    await Promise.all([
      db.doc(`users/${CRAIG_UID}`).get(),
      db.doc(`users/${BRENT_UID}`).get(),
      db.doc(`companyConnections/${CONNECTION_ID}`).get(),
      db
        .collection("posts")
        .where("sharedWithCompanies", "array-contains", SOURCE_COMPANY_ID)
        .get(),
      db
        .collection("posts")
        .where("sharedWithCompanies", "array-contains", TARGET_COMPANY_ID)
        .get(),
    ]);

  const craig = craigSnap.data() || {};
  const brent = brentSnap.data() || {};
  const connection = connectionSnap.data() || {};
  const healyTotals = await calculateCounts(HEALY_COMPANY_ID);

  assert(craig.companyId === TARGET_COMPANY_ID, "Craig was not moved.");
  assert(craig.role === "admin", "Craig is not an admin.");
  assert(craig.reportsTo === BRENT_UID, "Craig does not report to Brent.");
  assert(brent.role === "super-admin", "Brent is not a super-admin.");
  assert(
    connection.requestToCompanyId === TARGET_COMPANY_ID,
    "The connection was not moved in place."
  );
  assert(oldPosts.empty, "Some posts still reference the duplicate company.");

  return {
    craig: {
      companyId: craig.companyId,
      role: craig.role,
      reportsTo: craig.reportsTo,
    },
    brent: { companyId: brent.companyId, role: brent.role },
    connection: {
      id: CONNECTION_ID,
      companyIds: connection.companyIds,
      status: connection.status,
    },
    postVisibility: {
      oldCompanyReferences: oldPosts.size,
      targetCompanyReferences: newPosts.size,
    },
    healy: healyTotals,
  };
}

async function main() {
  console.log(
    `Geloso company merge (${commit ? "COMMIT" : "dry run"}) — ${PROJECT_ID}`
  );

  const context = await loadAndValidate();
  console.log(
    JSON.stringify(
      {
        source: {
          id: SOURCE_COMPANY_ID,
          name: context.source.companyName,
        },
        target: {
          id: TARGET_COMPANY_ID,
          name: context.target.companyName,
        },
        users: {
          craig: "move to target; keep admin; report to Brent",
          brent: "keep in target; promote to super-admin",
        },
        connection: {
          id: CONNECTION_ID,
          action: "retarget in place; do not create another connection",
          healyConnectionsBefore: context.healyConnectionCount,
        },
        postsToRepair: context.postsSharedWithSource.size,
        duplicateCompany: "retain for later manual deletion",
      },
      null,
      2
    )
  );

  if (!commit) {
    console.log("Dry run only. Re-run with --commit to apply.");
    return;
  }

  await applyMigration(context);
  const result = await verify();
  console.log("Migration verified:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Geloso merge failed:", err);
    process.exit(1);
  });
