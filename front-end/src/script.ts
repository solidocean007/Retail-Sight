// import { getDocs, collection, doc, writeBatch } from "firebase/firestore";
// import { db } from "./utils/firebase";
// import { CompanyAccountType } from "./utils/types";

// export const updatePostsWithFreshAccounts = async (
//   updatedAccounts: CompanyAccountType[],
// ) => {
//   const postsSnap = await getDocs(collection(db, "posts"));
//   const accountMap = new Map(
//     updatedAccounts.map((acc) => [String(acc.accountNumber), acc]),
//   );

//   let batch = writeBatch(db); // ✅ initialize batch
//   let updatedCount = 0;
//   let opCount = 0;

//   for (const postDoc of postsSnap.docs) {
//     const postData = postDoc.data();
//     const oldAccNum = String(postData.account?.accountNumber);
//     const freshAccount = accountMap.get(oldAccNum);

//     if (!freshAccount) {
//       console.warn(`⚠️ No updated account found for ${oldAccNum}`);
//       continue;
//     }

//     const postRef = doc(db, "posts", postDoc.id);
//     batch.update(postRef, {
//       account: freshAccount,
//     });
//     updatedCount++;
//     opCount++;

//     if (opCount === 400) {
//       await batch.commit();
//       console.log(`✅ Committed 400 updates...`);
//       batch = writeBatch(db); // ✅ reset batch after commit
//       opCount = 0;
//     }
//   }

//   if (opCount > 0) {
//     await batch.commit();
//     console.log(`✅ Final batch committed (${updatedCount} total updates)`);
//   }
// };
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./utils/firebase";

function getThumbnailUrl(imageUrl: string): string {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/");
    const filename = parts.pop();
    if (!filename) return imageUrl;
    const [base, ext] = filename.split(".");
    const thumbFilename = `${base}_200x200.${ext}`;
    parts.push(thumbFilename);
    url.pathname = parts.join("/");
    return url.toString();
  } catch {
    return imageUrl;
  }
}

export const runThumbnailMigration = async () => {
  const collectionsRef = collection(db, "collections");
  const collectionsSnapshot = await getDocs(collectionsRef);

  for (const collectionDoc of collectionsSnapshot.docs) {
    const collectionData = collectionDoc.data();
    const postIds = collectionData.posts || [];

    const previewImages: string[] = [];

    for (const postId of postIds) {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const post = postSnap.data();
        if (post.imageUrl) {
          const thumbUrl = getThumbnailUrl(post.imageUrl);
          previewImages.push(thumbUrl);
        }
      }

      if (previewImages.length >= 6) break;
    }

    await updateDoc(doc(db, "collections", collectionDoc.id), {
      previewImages,
    });

    console.log(`✅ Updated collection ${collectionDoc.id} with ${previewImages.length} previews`);
  }
};

