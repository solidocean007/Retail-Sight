import { collection, getDocs } from "firebase/firestore";
import { db } from "./utils/firebase"; // adjust path as needed

export async function logMissingAccountInfoReport() {
  const snapshot = await getDocs(collection(db, "posts"));

  let missingAccountType = 0;
  let missingChain = 0;
  let missingChainType = 0;

  const missingAccountTypeIds: string[] = [];
  const missingChainIds: string[] = [];
  const missingChainTypeIds: string[] = [];

  snapshot.forEach((doc) => {
    const post = doc.data();
    const id = doc.id;

    if (!post.accountType || post.accountType.trim() === "") {
      missingAccountType++;
      missingAccountTypeIds.push(id);
    }

    if (!post.chain || post.chain.trim() === "") {
      missingChain++;
      missingChainIds.push(id);
    }

    if (!post.chainType || post.chainType.trim() === "") {
      missingChainType++;
      missingChainTypeIds.push(id);
    }
  });

  console.log("📝 Missing Account Info Report:");
  console.log(`Total Posts: ${snapshot.size}`);
  console.log(
    `Posts missing accountType: ${missingAccountType}`,
    missingAccountTypeIds.slice(0, 10)
  );
  console.log(
    `Posts missing chain: ${missingChain}`,
    missingChainIds.slice(0, 10)
  );
  console.log(
    `Posts missing chainType: ${missingChainType}`,
    missingChainTypeIds.slice(0, 10)
  );
}

import { updateDoc, doc, query, where } from "firebase/firestore";
import { getAllCompanyAccountsFromIndexedDB } from "./utils/database/accountStoreUtils";

export async function backfillMissingAccountFields() {
  const postSnapshot = await getDocs(collection(db, "posts"));
  const allAccounts = await getAllCompanyAccountsFromIndexedDB();

  const accountsByNumber = new Map(
    allAccounts.map((acc) => [acc.accountNumber, acc])
  );

  let updatedCount = 0;
  const failedUpdates: string[] = [];

  for (const docSnap of postSnapshot.docs) {
    const post = docSnap.data();
    const postId = docSnap.id;

    const accNum = post.accountNumber?.toString().trim();


    if (!accNum) continue;

    const matchingAccount = accountsByNumber.get(accNum);
    if (!matchingAccount) continue;

    const shouldUpdate =
      post.accountType === undefined ||
      post.accountType === "" ||
      post.chain === undefined ||
      post.chain === "" ||
      post.chainType === undefined ||
      post.chainType === "";

    if (shouldUpdate) {
      try {
       const updates: any = {};

if (
  post.accountType === undefined ||
  post.accountType === ""
) {
  if (matchingAccount.typeOfAccount) {
    updates.accountType = matchingAccount.typeOfAccount;
  }
}
if (
  post.chain === undefined ||
  post.chain === ""
) {
  if (matchingAccount.chain) {
    updates.chain = matchingAccount.chain;
  }
}
if (
  post.chainType === undefined ||
  post.chainType === ""
) {
  if (matchingAccount.chainType) {
    updates.chainType = matchingAccount.chainType;
  }
}

if (Object.keys(updates).length > 0) {
  await updateDoc(doc(db, "posts", postId), updates);
  updatedCount++;
  console.log(`✅ Updated ${postId}`, updates);
}

      } catch (err) {
        console.warn(`❌ Failed to update ${postId}`, err);
        failedUpdates.push(postId);
      }
    }
  }

  console.log(`🧼 Backfill complete. Updated ${updatedCount} posts.`);
  if (failedUpdates.length > 0) {
    console.log("❗ Posts that failed to update:", failedUpdates);
  }
}
