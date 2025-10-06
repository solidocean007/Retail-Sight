import { PostWithID } from "../types";
import { openDB } from "./indexedDBOpen";

const SHARED_POSTS_STORE = "sharedPosts";

/**
 * Overwrites and saves shared posts to IndexedDB.
 */
export async function addSharedPostsToIndexedDB(
  posts: PostWithID[]
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([SHARED_POSTS_STORE], "readwrite");
  const store = transaction.objectStore(SHARED_POSTS_STORE);

  return new Promise<void>((resolve, reject) => {
    // Clear existing data before writing
    const clearRequest = store.clear();

    clearRequest.onerror = (event) => {
      console.error("Error clearing shared posts:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    clearRequest.onsuccess = () => {
      // Proceed with writing new posts
      posts.forEach((post, index) => {
        const request = store.put(post);
        request.onsuccess = () => {
        };
        request.onerror = () => {
          console.error(
            `Error adding shared post ${index} to IndexedDB:`,
            request.error
          );
          reject(request.error);
        };
      });
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => {
      console.error("Transaction error (shared posts):", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };
  });
}

/**
 * Reads all shared posts from IndexedDB.
 */
export async function getSharedPostsFromIndexedDB(): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction([SHARED_POSTS_STORE], "readonly");
  const store = transaction.objectStore(SHARED_POSTS_STORE);

  return new Promise<PostWithID[]>((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as PostWithID[]);
    request.onerror = () => {
      console.error("Error reading shared posts:", request.error);
      reject(request.error);
    };
  });
}

/**
 * Clears all shared posts from IndexedDB.
 */
export async function clearSharedPostsFromIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([SHARED_POSTS_STORE], "readwrite");
  const store = transaction.objectStore(SHARED_POSTS_STORE);

  return new Promise<void>((resolve, reject) => {
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Error clearing shared posts store:", request.error);
      reject(request.error);
    };
  });
}
