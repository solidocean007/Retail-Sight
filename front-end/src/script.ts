import {
  addDoc,
  collection,
  deleteField,
  doc,
  DocumentData,
  FieldValue,
  getDoc,
  getDocs,
  QueryDocumentSnapshot,
  setDoc,
} from "@firebase/firestore";
import { db } from "./utils/firebase"; // adjust path as needed

import { query, where, updateDoc } from "firebase/firestore";
import fs from "fs";

export async function auditPostDates() {
  try {
    const snapshot = await getDocs(collection(db, "posts"));
    console.log(`[Audit] Found ${snapshot.size} posts in Firestore`);

    let issuesFound = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;

      const displayDate = data.displayDate;
      const timestamp = data.timestamp;

      const isDisplayDateString = typeof displayDate === "string";
      const isTimestampString = typeof timestamp === "string";

      if (isDisplayDateString || isTimestampString) {
        console.warn(`[Issue] Post ${id} has:`, {
          ...(isDisplayDateString && { displayDate }),
          ...(isTimestampString && { timestamp }),
        });
        issuesFound++;
      }
    });

    if (issuesFound === 0) {
      console.log(
        "✅ No issues found. All displayDate/timestamp fields are Timestamps."
      );
    } else {
      console.warn(`🚨 Found ${issuesFound} posts with string dates.`);
    }
  } catch (err) {
    console.error("[Audit] Failed to read posts:", err);
  }
}

import { writeBatch, Timestamp } from "firebase/firestore";
import path from "path";
import { fstat } from "fs";

function isValidDateString(value: any): boolean {
  if (typeof value !== "string") return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export async function migratePostDates() {
  const postsRef = collection(db, "posts");
  const snapshot = await getDocs(postsRef);

  console.log(`Found ${snapshot.size} posts. Starting migration...`);
  let updatedCount = 0;
  let skippedCount = 0;

  let batch = writeBatch(db);
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;

    // Check and update displayDate
    if (typeof data.displayDate === "string") {
      if (isValidDateString(data.displayDate)) {
        batch.update(doc.ref, {
          displayDate: Timestamp.fromDate(new Date(data.displayDate)),
        });
        needsUpdate = true;
      } else {
        console.warn(
          `[SKIPPED] Post ${doc.id} has invalid displayDate:`,
          data.displayDate
        );
        skippedCount++;
      }
    }

    // Check and update timestamp
    if (typeof data.timestamp === "string") {
      if (isValidDateString(data.timestamp)) {
        batch.update(doc.ref, {
          timestamp: Timestamp.fromDate(new Date(data.timestamp)),
        });
        needsUpdate = true;
      } else {
        console.warn(
          `[SKIPPED] Post ${doc.id} has invalid timestamp:`,
          data.timestamp
        );
        skippedCount++;
      }
    }

    if (needsUpdate) {
      updatedCount++;
      batchCount++;
      console.log(`[Update] Post ${doc.id}`);
    }

    // Commit every 450 updates to avoid batch limit
    if (batchCount >= 450) {
      await batch.commit();
      console.log("🔥 Committed batch of 450 updates");
      batch = writeBatch(db); // Start new batch
      batchCount = 0;
    }
  }

  // Commit any remaining updates
  if (batchCount > 0) {
    await batch.commit();
    console.log("🔥 Final batch committed");
  }

  console.log(`✅ Migration complete. Updated ${updatedCount} posts.`);
  console.warn(`🚨 Skipped ${skippedCount} posts due to invalid dates.`);
}

// src/debug/logTimestamps.ts
import { Timestamp as FSTimestamp } from "firebase/firestore";

// Collections to scan by default
const DEFAULT_COLLECTIONS = [
  "users",
  "posts",
  "companies",
  "accessRequests",
  "invites",
  "notifications",
  "galloGoals",
  "collections",
  "companyConnections",
];

type FieldFinding = {
  fieldPath: string;
  kind: "Firestore.Timestamp" | "Date";
  iso: string | null;
  seconds?: number;
  nanoseconds?: number;
};

const isFSTimestamp = (v: any): v is FSTimestamp =>
  !!v &&
  typeof v === "object" &&
  typeof v.toDate === "function" &&
  typeof v.toMillis === "function";

const isJsDate = (v: any): v is Date => v instanceof Date;

const toIso = (v: unknown): string | null => {
  try {
    if (isFSTimestamp(v)) return v.toDate().toISOString();
    if (isJsDate(v)) return v.toISOString();
  } catch {}
  return null;
};

function findTimestampsDeep(value: any, basePath: string, out: FieldFinding[]) {
  if (value == null) return;

  if (isFSTimestamp(value) || isJsDate(value)) {
    out.push({
      fieldPath: basePath || "(root)",
      kind: isFSTimestamp(value) ? "Firestore.Timestamp" : "Date",
      iso: toIso(value),
      ...(isFSTimestamp(value)
        ? {
            seconds: (value as any).seconds,
            nanoseconds: (value as any).nanoseconds,
          }
        : {}),
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      findTimestampsDeep(item, `${basePath}[${i}]`, out)
    );
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const next = basePath ? `${basePath}.${k}` : k;
      findTimestampsDeep(v, next, out);
    }
  }
}

/**
 * Scan the given top-level collections and log any Timestamp/Date fields.
 * Usage from DevTools:
 *    logTimestamps()                      // scan defaults
 *    logTimestamps(['posts','users'], 50) // scan specific, limit 50 docs each
 */
export async function logTimestamps(
  collections: string[] = DEFAULT_COLLECTIONS,
  maxDocsPerCollection = 0
) {
  console.group("🔎 Firestore Timestamp scan");
  console.log("Collections:", collections.join(", "));
  if (maxDocsPerCollection > 0)
    console.log("MAX_DOCS per collection:", maxDocsPerCollection);

  for (const col of collections) {
    console.group(`→ ${col}`);
    try {
      const snap = await getDocs(collection(db, col));
      let processed = 0;
      let docsWithFindings = 0;
      let totalFieldFindings = 0;

      for (const docSnap of snap.docs) {
        if (maxDocsPerCollection > 0 && processed++ >= maxDocsPerCollection)
          break;

        const data = docSnap.data();
        const findings: FieldFinding[] = [];
        findTimestampsDeep(data, "", findings);

        if (findings.length) {
          docsWithFindings++;
          totalFieldFindings += findings.length;

          console.groupCollapsed(
            `📄 ${col}/${docSnap.id} — ${findings.length} field(s)`
          );
          findings.forEach((f) => {
            console.log(`${f.fieldPath} → ${f.kind}`, {
              iso: f.iso,
              seconds: f.seconds,
              nanoseconds: f.nanoseconds,
            });
          });
          console.groupEnd();
        }
      }

      console.log(
        `Summary for ${col}: ${totalFieldFindings} field(s) across ${docsWithFindings} doc(s).`
      );
    } catch (err) {
      console.error(`Failed scanning ${col}:`, err);
    }
    console.groupEnd();
  }
  console.groupEnd();
}

// expose to window for easy calling from DevTools
// (safe no-op in Node; only matters in the browser)
(window as any).logTimestamps = logTimestamps;

export async function migrateVisibility() {
  const postsRef = collection(db, "posts");
  const snap = await getDocs(postsRef);

  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const updates: any = {};

    // 1. Always add migratedVisibility if missing
    if (!data.migratedVisibility) {
      updates.migratedVisibility = "network";
    }

    // 2. Normalize visibility back to company
    if (data.visibility === "network" || data.visibility === "companyOnly") {
      updates.visibility = "company";
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc.ref, updates);
      console.log(`[Update] ${doc.id}`, updates);
      updated++;
    }
  }

  console.log(`✅ Migration done. Updated ${updated} posts.`);
}


// scripts/auditCompanyId.ts

// utils/auditCompanyIdClient.ts

export type CompanyIdAuditResult = {
  counts: {
    topLevel: number;
    nested: number;
    flat: number;
    missing: number;
    total: number;
  };
  sample: {
    topLevel: string[];
    nested: string[];
    flat: string[];
    missing: string[];
  };
};

export async function auditCompanyIdClient(): Promise<CompanyIdAuditResult> {
  const snap = await getDocs(collection(db, "posts"));

  let topLevel = 0;
  let nested = 0;
  let flat = 0;
  let missing = 0;

  const sample = {
    topLevel: [] as string[],
    nested: [] as string[],
    flat: [] as string[],
    missing: [] as string[],
  };

  snap.forEach((docSnap) => {
    const d = docSnap.data() as any;

    if (d.companyId) {
      topLevel++;
      if (sample.topLevel.length < 10) sample.topLevel.push(docSnap.id);
    }

    if (d.postUser?.companyId) {
      nested++;
      if (sample.nested.length < 10) sample.nested.push(docSnap.id);
    }

    if (d.postUserCompanyId) {
      flat++;
      if (sample.flat.length < 10) sample.flat.push(docSnap.id);
    }

    if (!d.companyId && !d.postUser?.companyId && !d.postUserCompanyId) {
      missing++;
      if (sample.missing.length < 10) sample.missing.push(docSnap.id);
    }
  });

  const result: CompanyIdAuditResult = {
    counts: {
      topLevel,
      nested,
      flat,
      missing,
      total: snap.size,
    },
    sample,
  };

  console.group("📊 CompanyId audit");
  console.log(`Top-level companyId: ${topLevel}`);
  console.log(`Nested postUser.companyId: ${nested}`);
  console.log(`Flat postUserCompanyId: ${flat}`);
  console.log(`Missing all: ${missing}`);
  console.log(`Total posts: ${snap.size}`);
  console.groupEnd();

  return result;
}

// Optional: expose to DevTools for quick use
// (safe in browser; no-op in SSR/Node)
try {
  (window as any).auditCompanyIdClient = auditCompanyIdClient;
} catch {}

// utils/migrations/migrateTopLevelCompanyId.ts

// type PostDoc = QueryDocumentSnapshot<DocumentData>;

// export async function migrateTopLevelCompanyId() {
//   const snap = await getDocs(collection(db, "posts"));
//   console.log(`Found ${snap.size} posts. Starting migration...`);

//   let updated = 0;
//   let alreadyHad = 0;
//   let missingAll = 0;

//   let batch = writeBatch(db);
//   let ops = 0;

//   const docs: PostDoc[] = snap.docs as PostDoc[];

//   for (const docSnap of docs) {
//     const data = docSnap.data() as any;

//     if (
//       data.companyId &&
//       typeof data.companyId === "string" &&
//       data.companyId.trim()
//     ) {
//       alreadyHad++;
//       continue;
//     }

//     const candidate: string | undefined =
//       (typeof data.postUserCompanyId === "string" &&
//         data.postUserCompanyId.trim()) ||
//       (typeof data.postUser?.companyId === "string" &&
//         data.postUser.companyId.trim()) ||
//       undefined;

//     if (!candidate) {
//       missingAll++;
//       continue;
//     }

//     batch.update(docSnap.ref, { companyId: candidate });
//     updated++;
//     ops++;

//     // Commit every ~450 ops (limit is 500)
//     if (ops >= 450) {
//       await batch.commit();
//       console.log(`Committed a batch of ${ops} updates...`);
//       batch = writeBatch(db);
//       ops = 0;
//     }
//   }

//   if (ops > 0) {
//     await batch.commit();
//     console.log(`Committed final batch of ${ops} updates.`);
//   }

//   console.log("✅ Migration complete.");
//   console.log({ updated, alreadyHad, missingAll, total: snap.size });
// }
