// import { collection, getDocs, writeBatch } from "@firebase/firestore";
// import { db } from "./utils/firebase"; // adjust path as needed

// const migratePostsVisibility = async () => {
//   console.log("🚀 Starting migration...");

//   const postsRef = collection(db, "posts");
//   const snapshot = await getDocs(postsRef);

//   const batchSize = 500; // Firestore batch limit
//   let batch = writeBatch(db);
//   let counter = 0;

//   for (const doc of snapshot.docs) {
//     const data = doc.data();

//     // Skip if already migrated
//     if (data.migratedVisibility) {
//       console.log(`✅ Skipping ${doc.id}, already migrated`);
//       continue;
//     }

//     // Set migratedVisibility to 'network'
//     batch.update(doc.ref, {
//       migratedVisibility: "network",
//     });

//     counter++;

//     // Commit every 500 writes
//     if (counter % batchSize === 0) {
//       console.log(`💾 Committing batch at ${counter} posts`);
//       await batch.commit();
//       batch = writeBatch(db); // Start new batch
//     }
//   }

//   // Commit any remaining writes
//   if (counter % batchSize !== 0) {
//     console.log(`💾 Committing final batch at ${counter} posts`);
//     await batch.commit();
//   }

//   console.log(`🎉 Migration complete. Total posts processed: ${counter}`);
// };

// export default migratePostsVisibility;
