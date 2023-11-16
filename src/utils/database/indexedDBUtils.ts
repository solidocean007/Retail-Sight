// indexedDBUtils.ts
const dbName = "myRetailAppDB";
const dbVersion = 1; // Increment for each schema change
import { PostType } from "../types";

function openDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      reject(`IndexedDB database error: ${event.target} `); // Expected 0-1 arguments, but got 2
    };

    request.onsuccess = () => { // event is defined but never used
      resolve(request.result);
    };

    // request.onupgradeneeded = (event) => {
    request.onupgradeneeded = () => {
      const db = request.result; // Directly use request.result
      if (!db.objectStoreNames.contains('posts')) {
        db.createObjectStore('posts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('channels')) {
        db.createObjectStore('channels', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { keyPath: 'state' });
      }
      // Add 'companies' object store when you add that collection
    };
  });
}

export async function addPostsToIndexedDB(posts: PostType[]): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['posts'], 'readwrite');
  const store = transaction.objectStore('posts');
  
  return new Promise<void>((resolve, reject) => {
    // Handle the successful completion of the transaction
    transaction.oncomplete = () => {
      resolve();
    };
  
    // Handle any errors that occur during the transaction
    transaction.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    // Perform the 'put' operations for each post
    posts.forEach((post) => {
      const request = store.put(post);
      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}


export async function getPostsFromIndexedDB(): Promise<PostType[]> { 
  const db = await openDB();
  const transaction = db.transaction(['posts'], 'readonly');
  const store = transaction.objectStore('posts');
  const getAllRequest = store.getAll();
  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result);
    };
    getAllRequest.onerror = () => {
      reject('Error getting posts from IndexedDB');
    };
  });
}

// Create a utility function that retrieves filtered posts from IndexedDB
async function getFilteredPostsFromIndexedDB(filters) {
  // This function should connect to IndexedDB, apply the filters to the posts stored there,
  // and return a promise that resolves with the filtered posts.
  // Here you need to implement the IndexedDB retrieval logic based on the filters.
}

// Create a utility function that stores filtered posts in IndexedDB
async function storeFilteredPostsInIndexedDB(posts, filters) {
  // This function should connect to IndexedDB and store the posts.
  // Each post could have an additional field indicating the filters it matches.
  // Here you need to implement the IndexedDB storage logic.
}

// Similar functions for 'categories', 'channels', 'locations', and later 'companies'


