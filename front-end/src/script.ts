import { addDoc, collection, doc, getDoc, getDocs, setDoc } from "@firebase/firestore";
import { db } from "./utils/firebase"; // adjust path as needed

import {
  query,
  where,
  updateDoc,
} from "firebase/firestore";


export async function findMismatchedAccountNumbers() {
  const postsRef = collection(db, "posts");
  const snapshot = await getDocs(postsRef);

  const mismatches: any[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const topLevelAccNum = data.accountNumber || null;
    const nestedAccNum = data.account?.accountNumber || null;

    if (topLevelAccNum !== nestedAccNum) {
      mismatches.push({
        id: doc.id,
        topLevelAccNum,
        nestedAccNum,
      });
    }
  });

  console.log(`Found ${mismatches.length} mismatches:`);
  console.table(mismatches);
}

export async function testEmail() {
  try {
    await addDoc(collection(db, "mail"), {
      to: ["clintonWilliams007@gmail.com"], // array of recipients
      message: {
        subject: "Test Email from Firestore Trigger",
        text: "If you are reading this, your extension works!",
        html: "<h1>Firestore Trigger Email Test</h1><p>This is a test email.</p>"
      }
    });
    console.log("Test email document written to 'mail' collection");
  } catch (err) {
    console.error("Error adding test email:", err);
  }
}



// UIDs and info
// const OLD_UID = "3VwmlHNu0dZZJFM9AgkUI0qyUbu2";
// const NEW_UID = "QU5bbMlifjPU4bVpaj2gMooI4673";
// const NEW_EMAIL = "bneal@heaylwholesale.com"; // replace with actual
// const NEW_COMPANY_ID = "3WOAwgj3l3bnvHqE4lV3"; // assuming same
// const NEW_COMPANY_NAME = "Healy wholesale Inc";

// 🔁 Main Migration Logic
// export async function migratePostsToWorkAccount() {
//   const postsRef = collection(db, "posts"); // Change to your posts collection path
//   const q = query(postsRef, where("postUserUid", "==", OLD_UID));
//   const snapshot = await getDocs(q);

//   for (const docSnap of snapshot.docs) {
//     const postRef = doc(db, "posts", docSnap.id);
//     await updateDoc(postRef, {
//       "postUser.uid": NEW_UID,
//       "postUser.email": NEW_EMAIL,
//       "postUserUid": NEW_UID,
//       "postUserEmail": NEW_EMAIL,
//     });

//     console.log(`✅ Updated post ${docSnap.id}`);
//   }

//   console.log("🎉 Migration complete.");
// }




// export default backupAccounts;


// export async function logMissingAccountInfoReport() {
//   const snapshot = await getDocs(collection(db, "posts"));

//   let missingAccountType = 0;
//   let missingChain = 0;
//   let missingChainType = 0;

//   const missingAccountTypeIds: string[] = [];
//   const missingChainIds: string[] = [];
//   const missingChainTypeIds: string[] = [];

//   snapshot.forEach((doc) => {
//     const post = doc.data();
//     const id = doc.id;

//     if (!post.accountType || post.accountType.trim() === "") {
//       missingAccountType++;
//       missingAccountTypeIds.push(id);
//     }

//     if (!post.chain || post.chain.trim() === "") {
//       missingChain++;
//       missingChainIds.push(id);
//     }

//     if (!post.chainType || post.chainType.trim() === "") {
//       missingChainType++;
//       missingChainTypeIds.push(id);
//     }
//   });

//   console.log("📝 Missing Account Info Report:");
//   console.log(`Total Posts: ${snapshot.size}`);
//   console.log(
//     `Posts missing accountType: ${missingAccountType}`,
//     missingAccountTypeIds.slice(0, 10)
//   );
//   console.log(
//     `Posts missing chain: ${missingChain}`,
//     missingChainIds.slice(0, 10)
//   );
//   console.log(
//     `Posts missing chainType: ${missingChainType}`,
//     missingChainTypeIds.slice(0, 10)
//   );
// }

// import { updateDoc, doc, query, where } from "firebase/firestore";
// import { getAllCompanyAccountsFromIndexedDB } from "./utils/database/accountStoreUtils";

// export async function backfillMissingAccountFields() {
//   const postSnapshot = await getDocs(collection(db, "posts"));
//   const allAccounts = await getAllCompanyAccountsFromIndexedDB();

//   const accountsByNumber = new Map(
//     allAccounts.map((acc) => [acc.accountNumber, acc])
//   );

//   let updatedCount = 0;
//   const failedUpdates: string[] = [];

//   for (const docSnap of postSnapshot.docs) {
//     const post = docSnap.data();
//     const postId = docSnap.id;

//     const accNum = post.accountNumber?.toString().trim();


//     if (!accNum) continue;

//     const matchingAccount = accountsByNumber.get(accNum);
//     if (!matchingAccount) continue;

//     const shouldUpdate =
//       post.accountType === undefined ||
//       post.accountType === "" ||
//       post.chain === undefined ||
//       post.chain === "" ||
//       post.chainType === undefined ||
//       post.chainType === "";

//     if (shouldUpdate) {
//       try {
//        const updates: any = {};

// if (
//   post.accountType === undefined ||
//   post.accountType === ""
// ) {
//   if (matchingAccount.typeOfAccount) {
//     updates.accountType = matchingAccount.typeOfAccount;
//   }
// }
// if (
//   post.chain === undefined ||
//   post.chain === ""
// ) {
//   if (matchingAccount.chain) {
//     updates.chain = matchingAccount.chain;
//   }
// }
// if (
//   post.chainType === undefined ||
//   post.chainType === ""
// ) {
//   if (matchingAccount.chainType) {
//     updates.chainType = matchingAccount.chainType;
//   }
// }

// if (Object.keys(updates).length > 0) {
//   await updateDoc(doc(db, "posts", postId), updates);
//   updatedCount++;
//   console.log(`✅ Updated ${postId}`, updates);
// }

//       } catch (err) {
//         console.warn(`❌ Failed to update ${postId}`, err);
//         failedUpdates.push(postId);
//       }
//     }
//   }

//   console.log(`🧼 Backfill complete. Updated ${updatedCount} posts.`);
//   if (failedUpdates.length > 0) {
//     console.log("❗ Posts that failed to update:", failedUpdates);
//   }
// }

// fixPostUsers.js


// import { doc, getDoc, updateDoc } from "firebase/firestore";
// // import { db } from "./utils/firebase"; // adjust path if needed

// export async function fixPostUsers() {
//   const sourcePostId = "4yWObSfNSkOXn8rSdodv";
//   const postsToFix = ["hnOGGPsXdtMAQ6kjQcF5", "v4AxyeZXhcbcXN2KolmS"];

//   try {
//     const sourceSnap = await getDoc(doc(db, "posts", sourcePostId));
//     if (!sourceSnap.exists()) {
//       console.error("❌ Source post not found.");
//       return;
//     }

//     const sourceData = sourceSnap.data();
//     const postUser = sourceData?.postUser;
//     if (!postUser) {
//       console.error("❌ Source post is missing postUser.");
//       return;
//     }

//     for (const postId of postsToFix) {
//       const postRef = doc(db, "posts", postId);
//       const postSnap = await getDoc(postRef);

//       if (!postSnap.exists()) {
//         console.warn(`⚠️ Post ${postId} not found.`);
//         continue;
//       }

//       const postData = postSnap.data();
//       const updates: any = {
//         postUser: postUser,
//         postedBy: {
//           uid: postData.postedByUid || "",
//           firstName: postData.postedByFirstName || "",
//           lastName: postData.postedByLastName || "",
//           companyId: postUser.companyId || "", // assumed same company
//           role: "employee", // adjust if needed
//           email: postData.postedByEmail || "", // optional
//         },
//       };

//       // Remove flattened fields
//       updates.postedByUid = null;
//       updates.postedByFirstName = null;
//       updates.postedByLastName = null;
//       updates.postedByEmail = null;

//       await updateDoc(postRef, updates);
//       console.log(`✅ Fixed post ${postId}`);
//     }

//     console.log("🎉 Done fixing posts.");
//   } catch (err) {
//     console.error("❌ Error while fixing posts:", err);
//   }
// }


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
      console.log("✅ No issues found. All displayDate/timestamp fields are Timestamps.");
    } else {
      console.warn(`🚨 Found ${issuesFound} posts with string dates.`);
    }
  } catch (err) {
    console.error("[Audit] Failed to read posts:", err);
  }
}

import {
  writeBatch,
  Timestamp,
} from "firebase/firestore";

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


// function fixInvalidDateString(value: string): Date | null {
//   const match = value.match(/T(\d{2}):(\d{2}):(\d{2})/);
//   if (!match) return null; // Not even close to valid

//   let hour = parseInt(match[1], 10);
//   if (hour >= 24) {
//     console.warn(`[FIX] Adjusting hour ${hour} -> ${hour % 24}`);
//     hour = hour % 24;
//     const fixed = value.replace(/T\d{2}/, `T${hour.toString().padStart(2, "0")}`);
//     const fixedDate = new Date(fixed);
//     return isNaN(fixedDate.getTime()) ? null : fixedDate;
//   }

//   const d = new Date(value);
//   return isNaN(d.getTime()) ? null : d;
// }

// export async function fixSinglePost(postId: string) {
//   const postRef = doc(db, "posts", postId);
//   const snap = await getDoc(postRef);

//   if (!snap.exists()) {
//     console.error(`❌ Post ${postId} does not exist`);
//     return;
//   }

//   const data = snap.data();
//   let updatedFields: any = {};

//   // Fix displayDate
//   if (typeof data.displayDate === "string") {
//     const fixedDate = fixInvalidDateString(data.displayDate);
//     if (fixedDate) {
//       updatedFields.displayDate = Timestamp.fromDate(fixedDate);
//       console.log(`[Update] Fixed displayDate for ${postId}:`, fixedDate);
//     } else {
//       console.warn(`[SKIP] Unfixable displayDate for ${postId}:`, data.displayDate);
//     }
//   }

//   // Fix timestamp
//   if (typeof data.timestamp === "string") {
//     const fixedTime = fixInvalidDateString(data.timestamp);
//     if (fixedTime) {
//       updatedFields.timestamp = Timestamp.fromDate(fixedTime);
//       console.log(`[Update] Fixed timestamp for ${postId}:`, fixedTime);
//     } else {
//       console.warn(`[SKIP] Unfixable timestamp for ${postId}:`, data.timestamp);
//     }
//   }

//   if (Object.keys(updatedFields).length > 0) {
//     await updateDoc(postRef, updatedFields);
//     console.log(`✅ Successfully updated post ${postId}`);
//   } else {
//     console.log(`⚠️ No updates applied to post ${postId}`);
//   }
// }

// fixSinglePost("GIMl8WhFoKgGMyKHJ9B6");

// ✅ Create the document
// export const createCompanyConnection = async () => {
//   const collectionRef = collection(db, "companyConnections");

//   await addDoc(collectionRef, {
//     fromCompanyId: "3WOAwgj3l3bnvHqE4IV3", // Healy company ID
//     toCompanyId: "gfvld", // Gallo company ID
//     status: "approved",
//     integration: "galloAxis",
//     integrationLevel: "full",
//     createdAt: Timestamp.fromDate(new Date("2025-07-04T00:00:00Z")), // July 4, 2025 UTC
//   });

//   console.log("✅ companyConnections document created successfully!");
// };

