// indexedDBUtils.ts
import { PostType } from "../types";
import { FilterCriteria } from "../../Slices/postsSlice";
import { openDB } from "./indexedDBOpen";

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
export async function getFilteredPostsFromIndexedDB(filters: FilterCriteria): Promise<PostType[]> {
  const db = await openDB();
  const transaction = db.transaction(['posts'], 'readonly');
  const store = transaction.objectStore('posts');
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      const allPosts = getAllRequest.result;
      const filteredPosts = allPosts.filter(post => 
        (!filters.channels!.length || filters.channels!.includes(post.channel!)) &&
        (!filters.categories!.length || filters.categories!.includes(post.category!))
      );
      
      
      resolve(filteredPosts);
    };
    getAllRequest.onerror = () => {
      reject('Error getting filtered posts from IndexedDB');
    };
  });
}


// Create a utility function that stores filtered posts in IndexedDB
export async function storeFilteredPostsInIndexedDB(posts: PostType[], filters: FilterCriteria): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['posts'], 'readwrite');
  const store = transaction.objectStore('posts');

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    posts.forEach((post) => {
      // Clone the post object and add filter criteria to it
      const postWithFilters = { ...post, filters };
      const request = store.put(postWithFilters);
      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}


// Similar functions for 'categories', 'channels', 'locations', and later 'companies'

