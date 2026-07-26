/**
 * One-time backfill: stamp `createdByUserId` on Gallo goals that predate it.
 *
 * Gallo goals aren't in `companyGoals`, so report notifications resolve their
 * admin from `galloGoals/{goalId}.createdByUserId`. Goals imported before that
 * field existed have no owner and reach nobody — this fills them in.
 *
 * Only touches documents where the field is MISSING. A goal imported after the
 * change already has the right owner and is left alone.
 *
 * Usage (from the functions/ directory):
 *
 *   node scripts/backfillGalloGoalCreator.js <uid>                  # dry run
 *   node scripts/backfillGalloGoalCreator.js <uid> --company=<id>   # scoped
 *   node scripts/backfillGalloGoalCreator.js <uid> --commit         # write
 *
 * Credentials: needs Admin SDK access, which the firebase CLI login does NOT
 * provide. Either run `gcloud auth application-default login` first, or set
 * GOOGLE_APPLICATION_CREDENTIALS to a service-account key path.
 */

const admin = require("firebase-admin");

const PROJECT_ID = "retail-sight";

const args = process.argv.slice(2);
const uid = args.find((a) => !a.startsWith("--"));
const commit = args.includes("--commit");
const companyArg = args.find((a) => a.startsWith("--company="));
const companyId = companyArg ? companyArg.split("=")[1] : null;

if (!uid) {
  console.error(
    "Usage: node scripts/backfillGalloGoalCreator.js <uid> [--company=<id>] [--commit]"
  );
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

(async () => {
  let query = db.collection("galloGoals");
  if (companyId) query = query.where("companyId", "==", companyId);

  const snap = await query.get();

  const targets = snap.docs.filter((d) => {
    const existing = d.data().createdByUserId;
    return !existing || !String(existing).trim();
  });

  console.log(
    `\n${snap.size} Gallo goal(s) found${companyId ? ` for company ${companyId}` : ""}; ` +
      `${targets.length} missing createdByUserId.\n`
  );

  if (!targets.length) {
    console.log("Nothing to do.");
    return;
  }

  // Printed before writing so a wrong company or an unexpected goal is visible
  // while the run is still a no-op.
  targets.forEach((d) => {
    const g = d.data();
    console.log(
      `  ${d.id}  company=${g.companyId || "?"}  ` +
        `${(g.goalDetails && g.goalDetails.goal) || "(untitled)"}`
    );
  });

  if (!commit) {
    console.log(
      `\nDRY RUN — nothing written. Re-run with --commit to set createdByUserId=${uid}.`
    );
    return;
  }

  const CHUNK = 450; // under Firestore's 500-write batch limit
  let written = 0;

  for (let i = 0; i < targets.length; i += CHUNK) {
    const batch = db.batch();
    targets.slice(i, i + CHUNK).forEach((d) => {
      batch.update(d.ref, { createdByUserId: uid });
    });
    await batch.commit();
    written += Math.min(CHUNK, targets.length - i);
  }

  console.log(`\nDone — createdByUserId set on ${written} goal(s).`);
})().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
