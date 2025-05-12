import { getDocs, collection, doc, writeBatch } from "firebase/firestore";
import { db } from "./utils/firebase";
import { CompanyAccountType } from "./utils/types";

export const updatePostsWithFreshAccounts = async (
  updatedAccounts: CompanyAccountType[],
) => {
  const postsSnap = await getDocs(collection(db, "posts"));
  const accountMap = new Map(
    updatedAccounts.map((acc) => [String(acc.accountNumber), acc]),
  );

  let batch = writeBatch(db); // ✅ initialize batch
  let updatedCount = 0;
  let opCount = 0;

  for (const postDoc of postsSnap.docs) {
    const postData = postDoc.data();
    const oldAccNum = String(postData.account?.accountNumber);
    const freshAccount = accountMap.get(oldAccNum);

    if (!freshAccount) {
      console.warn(`⚠️ No updated account found for ${oldAccNum}`);
      continue;
    }

    const postRef = doc(db, "posts", postDoc.id);
    batch.update(postRef, {
      account: freshAccount,
    });
    updatedCount++;
    opCount++;

    if (opCount === 400) {
      await batch.commit();
      console.log(`✅ Committed 400 updates...`);
      batch = writeBatch(db); // ✅ reset batch after commit
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    console.log(`✅ Final batch committed (${updatedCount} total updates)`);
  }
};
