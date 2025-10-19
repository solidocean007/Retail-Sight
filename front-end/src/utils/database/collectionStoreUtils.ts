import {
  CollectionType,
  CollectionWithId,
} from "../types";
import { openDB } from "./indexedDBOpen";

export async function addOrUpdateCollection(collection: CollectionType) {
  const db = await openDB();
  const tx = db.transaction("collections", "readwrite");
  const store = tx.objectStore("collections");
  store.put(collection); // This will add or update a collection
  // Wait for the transaction to complete
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function addPostToCollectionInDB(
  collectionId: string,
  postId: string,
) {
  const db = await openDB();
  const tx = db.transaction("collections", "readwrite");
  const store = tx.objectStore("collections");

  let collection = await new Promise<CollectionWithId | undefined>(
    (resolve, reject) => {
      const request = store.get(collectionId);
      request.onsuccess = () => resolve(request.result as CollectionWithId);
      request.onerror = () => reject(request.error);
    },
  );

  if (collection && !collection.posts.includes(postId)) {
    collection.posts.push(postId);
    store.put(collection);
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function removePostFromCollectionInDB(
  collectionId: string,
  postId: string,
) {
  const db = await openDB();
  const tx = db.transaction("collections", "readwrite");
  const store = tx.objectStore("collections");

  let collection = await new Promise<CollectionWithId | undefined>(
    (resolve, reject) => {
      const request = store.get(collectionId);
      request.onsuccess = () => resolve(request.result as CollectionWithId);
      request.onerror = () => reject(request.error);
    },
  );

  if (collection) {
    const index = collection.posts.indexOf(postId);
    if (index > -1) {
      collection.posts.splice(index, 1);
      store.put(collection);
    }
  }

  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCollectionsFromIndexedDB(): Promise<
  CollectionWithId[]
> {
  // this gets all of a users collections
  const db = await openDB();
  const transaction = db.transaction(["collections"], "readonly");
  const store = transaction.objectStore("collections");

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      // Assuming the request.result is an array of CollectionWithId objects
      resolve(request.result as CollectionWithId[]); // Type assertion here
    };

    request.onerror = () => {
      console.error(
        "Error fetching user collections from IndexedDB:",
        request.error,
      );
      reject(request.error);
    };
  });
}

// delete user created posts in indexedDB
export async function deleteUserCreatedCollectionFromIndexedDB(
  collectionId: string,
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["collections"], "readwrite");
  const store = transaction.objectStore("collections");

  return new Promise<void>((resolve, reject) => {
    const request = store.delete(collectionId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getOneCollectionFromIndexedDB(
  collectionId: string,
): Promise<CollectionWithId> {
  // this needs to retrieve a specific collection
  const db = await openDB();
  const transaction = db.transaction(["collections"], "readonly");
  const store = transaction.objectStore("collections");

  return new Promise((resolve, reject) => {
    const request = store.get(collectionId);

    request.onsuccess = () => {
      // Assuming the request.result is an array of CollectionWithId objects
      resolve(request.result as CollectionWithId); // Type assertion here
    };

    request.onerror = () => {
      console.error(
        "Error fetching a specific collection from IndexedDB:",
        request.error,
      );
      reject(request.error);
    };
  });
}