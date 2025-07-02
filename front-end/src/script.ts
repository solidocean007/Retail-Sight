import { collection, getDocs } from "firebase/firestore";
import { db } from "./utils/firebase"; // adjust path as needed

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

