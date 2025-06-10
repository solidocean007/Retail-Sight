// import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
// import { db } from "./utils/firebase";

// // export const migratePostToCleanedFlattenedVersion = async (postId: string) => {
// export const migratePostToCleanedFlattenedVersion = async (postId: string) => {
//   try {
//     const postRef = doc(db, "posts", postId);
//     const snapshot = await getDoc(postRef);

//     if (!snapshot.exists()) {
//       console.warn(`Post ${postId} not found.`);
//       return;
//     }

//     const data = snapshot.data();
//     const updates: Record<string, any> = {};
//     const deletions: string[] = [];

//     // ✅ Rename createdBy → postUser (as full UserType)
//     if (data.createdBy) {
//       updates.postUser = data.createdBy;
//     }

//     // ✅ Convert legacy postUserName → postUserFullName
//     if (data.postUserName) {
//       updates.postUserFullName = data.postUserName;
//     }

//     // ✅ Flatten account.name → accountName, etc.
//     const account = data.account;
//     if (account) {
//       updates.accountName = account.name || account.accountName || "";
//       updates.accountAddress = account.address || account.accountAddress || "";
//       updates.accountSalesRouteNums = account.salesRouteNums || [];
//     }

//     // ✅ Fields to clean up (after rewrite)
//     const legacyFieldsToRemove = [
//       "createdBy",         // fully replaced by postUser
//       "postUserName",      // now renamed to postUserFullName
//       "postUserCompany",
//     ];
//     for (const field of legacyFieldsToRemove) {
//       if (field in data) deletions.push(field);
//     }

//     // ✅ Avoid overwriting unchanged values
//     for (const key in updates) {
//       if (
//         key in data &&
//         data[key] !== undefined &&
//         data[key] !== null &&
//         data[key] !== "" &&
//         JSON.stringify(data[key]) === JSON.stringify(updates[key])
//       ) {
//         delete updates[key]; // no need to write again
//       }
//     }

//     // ✅ Apply updates if needed
//     if (Object.keys(updates).length > 0) {
//       await updateDoc(postRef, updates);
//       console.log(`✅ Updated ${postId} with`, updates);
//     }

//     // ✅ Remove legacy fields if present
//     if (deletions.length > 0) {
//       const deletePayload = Object.fromEntries(
//         deletions.map((key) => [key, deleteField()])
//       );
//       await updateDoc(postRef, deletePayload);
//       console.log(`🧹 Removed legacy fields from ${postId}:`, deletions);
//     }
//   } catch (err) {
//     console.error(`❌ Failed to migrate post ${postId}`, err);
//   }
// };




