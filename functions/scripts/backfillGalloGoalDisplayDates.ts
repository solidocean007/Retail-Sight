import * as admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

function dateStringToTimestamp(date?: string | null) {
  if (!date) return null;
  const ms = Date.parse(date);
  if (Number.isNaN(ms)) return null;
  return admin.firestore.Timestamp.fromMillis(ms);
}

async function backfillDisplayDates() {
  const goalsSnap = await db.collection("galloGoals").get();

  console.log(`🔍 Found ${goalsSnap.size} galloGoals`);

  let updated = 0;
  let skipped = 0;
  let missingProgram = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const goalDoc of goalsSnap.docs) {
    const goal = goalDoc.data();

    if (goal.displayDate) {
      skipped++;
      continue;
    }

    const companyId = goal.companyId;
    const programId = goal.programDetails?.programId;

    if (!companyId || !programId) {
      skipped++;
      continue;
    }

    const programRef = db.doc(
      `companies/${companyId}/galloPrograms/${programId}`
    );

    const programSnap = await programRef.get();

    if (!programSnap.exists) {
      missingProgram++;
      continue;
    }

    const displayDateStr = programSnap.data()?.displayDate;
    const displayDateTs = dateStringToTimestamp(displayDateStr);

    if (!displayDateTs) {
      skipped++;
      continue;
    }

    batch.update(goalDoc.ref, {
      displayDate: displayDateTs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    updated++;
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log("✅ Backfill complete", {
    updated,
    skipped,
    missingProgram,
  });
}

backfillDisplayDates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Backfill failed", err);
    process.exit(1);
  });
