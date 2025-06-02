// indexedDBUtils.ts
import {
  CollectionType,
  CollectionWithId,
  CompanyAccountType,
  CompanyGoalType,
  FireStoreGalloGoalDocType,
  GalloGoalType,
  PostType,
  PostWithID,
} from "../types";
import { FilterCriteria } from "../../Slices/postsSlice";
import { openDB } from "./indexedDBOpen";

// export async function addPostsToIndexedDB(posts: PostType[]): Promise<void> {
export async function addPostsToIndexedDB(posts: PostWithID[]): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    // Handle the successful completion of the transaction
    transaction.oncomplete = () => {
      console.log(
        "Transaction complete: Data added to IndexedDB successfully.",
      );
      resolve();
    };

    // Handle any errors that occur during the transaction
    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    // Perform the 'put' operations for each post
    posts.forEach((post, index) => {
      const request = store.put(post);
      request.onsuccess = () => {
        // console.log(`Post ${index} added to IndexedDB successfully:`, post);
      };
      request.onerror = () => {
        console.error(
          `Error adding post ${index} to IndexedDB:`,
          request.error,
        );
        reject(request.error);
      };
    });
  });
}

// clear posts from indexedDB
export async function clearPostsInIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      console.log("Posts cleared from IndexedDB successfully.");
    };

    clearRequest.onerror = () => {
      console.error("Error clearing posts from IndexedDB:", clearRequest.error);
      reject(clearRequest.error);
    };

    transaction.oncomplete = () => {
      console.log("Transaction completed: All posts cleared from IndexedDB.");
      resolve();
    };

    transaction.onerror = () => {
      console.error(
        "Transaction not completed due to error: ",
        transaction.error,
      );
      reject(transaction.error);
    };
  });
}

// clear posts from indexedDB
export async function clearUserCreatedPostsInIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["userCreatedPosts"], "readwrite");
  const store = transaction.objectStore("userCreatedPosts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();

    clearRequest.onsuccess = () => {
      console.log("User Created Posts cleared from IndexedDB successfully.");
    };

    clearRequest.onerror = () => {
      console.error(
        "Error clearing user created posts from IndexedDB:",
        clearRequest.error,
      );
      reject(clearRequest.error);
    };

    transaction.oncomplete = () => {
      console.log(
        "Transaction completed: All user created posts cleared from IndexedDB.",
      );
      resolve();
    };

    transaction.onerror = () => {
      console.error(
        "Transaction not completed due to error: ",
        transaction.error,
      );
      reject(transaction.error);
    };
  });
}

// update post in indexedDB
export async function updatePostInIndexedDB(post: PostWithID): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    const request = store.put(post); // 'put' will update if the record exists
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Add a single post to IndexedDB
export async function addNewlyCreatedPostToIndexedDB(
  post: PostWithID,
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    const request = store.put(post);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Remove a single post from IndexedDB
export async function removePostFromIndexedDB(postId: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    const request = store.delete(postId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// get posts from indexedDB
export async function getPostsFromIndexedDB(): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readonly");
  const store = transaction.objectStore("posts");
  const getAllRequest = store.getAll();
  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result);
    };
    getAllRequest.onerror = () => {
      reject("Error getting posts from IndexedDB");
    };
  });
}

// Create a utility function that retrieves filtered posts from IndexedDB
export async function getFilteredPostsFromIndexedDB(
  filters: FilterCriteria,
): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readonly");
  const store = transaction.objectStore("posts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      const allPosts = getAllRequest.result;
      // Assuming the date filter criteria includes a startDate and endDate
      const filteredPosts = allPosts.filter((post) => {
        const matchesChannel =
          !filters.channels ||
          filters.channels.length === 0 ||
          filters.channels.includes(post.channel);
        const matchesCategory =
          !filters.categories ||
          filters.categories.length === 0 ||
          filters.categories.includes(post.category);
        const postDate = post.displayDate ? new Date(post.displayDate) : null;

        // Convert the string dates in the filters to Date objects for comparison
        const startDate = filters.dateRange?.startDate
          ? new Date(filters.dateRange.startDate)
          : null;
        const endDate = filters.dateRange?.endDate
          ? new Date(filters.dateRange.endDate)
          : null;

        const matchesDateRange =
          !filters.dateRange ||
          (postDate &&
            startDate &&
            postDate >= startDate &&
            endDate &&
            postDate <= endDate);

        return matchesChannel && matchesCategory && matchesDateRange;
      });

      resolve(filteredPosts);
    };
    getAllRequest.onerror = () => {
      reject("Error getting filtered posts from IndexedDB");
    };
  });
}

// Utility function to store filtered posts in IndexedDB
export async function storeFilteredPostsInIndexedDB(
  posts: PostWithID[],
  filters: FilterCriteria,
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    posts.forEach((post) => {
      // Since dateRange is already in string format, no need to convert
      const serializableFilters = { ...filters };

      // Clone the post object and add filter criteria to it
      const postWithFilters = { ...post, filters: serializableFilters };
      const request = store.put(postWithFilters);

      request.onsuccess = () => {
        // console.log(`Post with ID ${post.id} stored successfully with filters.`);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

// store latest posts in indexDB
export async function storeLatestPostsInIndexedDB(
  posts: PostType[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["latestPosts"], "readwrite"); // Consider using a separate object store for latest posts
  const store = transaction.objectStore("latestPosts");

  return new Promise<void>((resolve, reject) => {
    // Clear existing posts before storing new ones to ensure the store only contains the latest posts
    const clearRequest = store.clear();
    clearRequest.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    clearRequest.onsuccess = () => {
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
    };
  });
}

// get the latest posts from indexedDB
export async function getLatestPostsFromIndexedDB(): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction(["latestPosts"], "readonly");
  const store = transaction.objectStore("latestPosts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () =>
      resolve(getAllRequest.result as PostWithID[]);
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

// store locations in indexedDB
export async function storeLocationsInIndexedDB(locations: {
  [key: string]: string[];
}): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["locations"], "readwrite");
  const store = transaction.objectStore("locations");

  return new Promise<void>((resolve, reject) => {
    // Clear existing locations before storing new ones
    const clearRequest = store.clear();
    clearRequest.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };

    clearRequest.onsuccess = () => {
      // Handle the successful completion of the transaction
      transaction.oncomplete = () => {
        resolve();
      };

      // Handle any errors that occur during the transaction
      transaction.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };

      // Perform the 'put' operations for each location
      for (const state in locations) {
        // Assuming that 'state' is the keyPath defined for your 'locations' object store
        // and the 'locations[state]' array is the value you want to store.
        // The key is already part of the value being stored, so you don't need to specify it again.
        const locationEntry = {
          state: state, // This is your key path
          cities: locations[state], // This is your value
        };

        // No need to pass the key as the second parameter since it's an inline key.
        const request = store.put(locationEntry);

        request.onerror = () => {
          reject(request.error);
        };
      }
    };
  });
}

// get locations from indexedDB
export async function getLocationsFromIndexedDB(): Promise<{
  [key: string]: string[];
} | null> {
  const db = await openDB();
  const transaction = db.transaction(["locations"], "readonly");
  const store = transaction.objectStore("locations");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      const allLocations = getAllRequest.result;

      if (!Array.isArray(allLocations) || allLocations.length === 0) {
        resolve(null); // Resolve with null if no data is found
        return;
      }

      const locations = allLocations.reduce((acc, location) => {
        // Assuming your keyPath is "state"
        const state = location.state;
        if (state && Array.isArray(location.cities)) {
          acc[state] = location.cities;
        } else {
        }
        return acc;
      }, {});

      resolve(locations);
    };
    getAllRequest.onerror = () => {
      console.error(
        "Error fetching locations from IndexedDB:",
        getAllRequest.error,
      );
      reject(getAllRequest.error);
    };
  });
}

// add hashtag posts to indexedDB
export async function addHashtagPostsToIndexedDB(
  posts: PostWithID[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["hashtagPosts"], "readwrite");
  const store = transaction.objectStore("hashtagPosts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    posts.forEach((post) => {
      const request = store.put(post);
      request.onerror = () => {
        console.error("Error adding post to IndexedDB:", request.error);
        reject(request.error);
      };
    });
  });
}

// add starTag posts to indexedDB
export async function addStarTagPostsToIndexedDB(
  posts: PostWithID[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["starTagPosts"], "readwrite");
  const store = transaction.objectStore("starTagPosts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    posts.forEach((post) => {
      const request = store.put(post);
      request.onerror = () => {
        console.error(
          "Error adding star tag posts to IndexedDB:",
          request.error,
        );
        reject(request.error);
      };
    });
  });
}

// get hashtag posts from indexedDB
export async function getHashtagPostsFromIndexedDB(): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction(["hashtagPosts"], "readonly");
  const store = transaction.objectStore("hashtagPosts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result as PostWithID[]);
    };
    getAllRequest.onerror = () => {
      console.error(
        "Error getting hashtag posts from IndexedDB:",
        getAllRequest.error,
      );
      reject(getAllRequest.error);
    };
  });
}

// get starTag posts from indexedDB
export async function getStarTagPostsFromIndexedDB(): Promise<PostWithID[]> {
  const db = await openDB();
  const transaction = db.transaction(["starTagPosts"], "readonly");
  const store = transaction.objectStore("starTagPosts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result as PostWithID[]);
    };
    getAllRequest.onerror = () => {
      console.error(
        "Error getting star tag posts from IndexedDB:",
        getAllRequest.error,
      );
      reject(getAllRequest.error);
    };
  });
}

// clear hashtag posts from indexedDB
export async function clearHashtagPostsInIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["hashtagPosts"], "readwrite");
  const store = transaction.objectStore("hashtagPosts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      resolve();
    };
    clearRequest.onerror = () => {
      console.error(
        "Error clearing hashtag posts from IndexedDB:",
        clearRequest.error,
      );
      reject(clearRequest.error);
    };
  });
}

// clear star tag posts from indexedDB
export async function clearStarTagPostsInIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["starTagPosts"], "readwrite");
  const store = transaction.objectStore("starTagPosts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      resolve();
    };
    clearRequest.onerror = () => {
      console.error(
        "Error clearing hashtag posts from IndexedDB:",
        clearRequest.error,
      );
      reject(clearRequest.error);
    };
  });
}

// add user created posts in indexedDB
export async function addUserCreatedPostsInIndexedDB(
  userPosts: PostWithID[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["userCreatedPosts"], "readwrite");
  const store = transaction.objectStore("userCreatedPosts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    userPosts.forEach((post) => {
      const request = store.put(post);
      request.onerror = () => {
        console.error(
          "Error adding user created post to IndexedDB:",
          request.error,
        );
        reject(request.error);
      };
    });
  });
}

// delete user created posts in indexedDB
export async function deleteUserCreatedPostInIndexedDB(
  postId: string,
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["userCreatedPosts"], "readwrite");
  const store = transaction.objectStore("userCreatedPosts");

  return new Promise<void>((resolve, reject) => {
    const request = store.delete(postId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getUserCreatedPostsFromIndexedDB(): Promise<
  PostWithID[] | undefined
> {
  const db = await openDB();
  const transaction = db.transaction(["userCreatedPosts"], "readonly");
  const store = transaction.objectStore("userCreatedPosts");

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error(
        "Error fetching user created posts from IndexedDB:",
        request.error,
      );
      reject(request.error);
    };
  });
}

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

export async function getLastSeenTimestamp(): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("lastSeenTimestamp", "readonly");
    const store = transaction.objectStore("lastSeenTimestamp");
    const request = store.get("timestamp");

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function setLastSeenTimestamp(timestamp: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("lastSeenTimestamp", "readwrite");
    const store = transaction.objectStore("lastSeenTimestamp");
    const request = store.put(timestamp, "timestamp");

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

export async function closeAndDeleteIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    db.close(); // Close the connection before attempting to delete

    return new Promise<void>((resolve, reject) => {
      const dbRequest = indexedDB.deleteDatabase("myRetailAppDB");

      // Timeout in case deletion gets blocked or hangs
      const timeout = setTimeout(() => {
        console.warn("Timeout: Deletion is taking too long.");
        resolve(); // Force resolve after timeout to prevent app hang
      }, 5000); // 5 seconds

      dbRequest.onsuccess = () => {
        clearTimeout(timeout);
        resolve();
      };

      dbRequest.onerror = (event) => {
        clearTimeout(timeout);
        const error = (event.target as IDBRequest).error;
        console.error("Error deleting IndexedDB database:", error);
        reject(error);
      };

      dbRequest.onblocked = () => {
        clearTimeout(timeout);
        console.warn("Deletion blocked. Close all tabs with this site open.");
        reject(new Error("Deletion blocked. Please close other tabs."));
      };
    });
  } catch (error) {
    console.error("Failed to open or delete the database:", error);
    throw new Error("Failed to delete the IndexedDB database.");
  }
}

export const saveAllCompanyAccountsToIndexedDB = async (
  accounts: CompanyAccountType[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allUsersCompanyAccounts"], "readwrite");
  const store = transaction.objectStore("allUsersCompanyAccounts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      // console.log("All company accounts saved to IndexedDB successfully.");
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        "Transaction error while saving all company accounts:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    accounts.forEach((account, index) => {
      if (!account.accountNumber) {
        console.error("Missing accountNumber for account:", account);
      } else {
        const request = store.put(account);
        request.onsuccess = () => {
          // Optional: console.log(`Account ${index} saved`);
        };
        request.onerror = () => {
          console.error(`Error saving account ${index}:`, request.error);
          reject(request.error);
        };
      }
    });
  });
};

export const getAllCompanyAccountsFromIndexedDB = async (): Promise<
  CompanyAccountType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["allUsersCompanyAccounts"], "readonly");
  const store = transaction.objectStore("allUsersCompanyAccounts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result as CompanyAccountType[]);
    };
    getAllRequest.onerror = () => {
      reject("Error retrieving all company accounts from IndexedDB");
    };
  });
};

export async function addAccountsToIndexedDB(
  accounts: CompanyAccountType[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["userAccounts_v2"], "readwrite");
  const store = transaction.objectStore("userAccounts_v2");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log(
        "Transaction complete: Accounts added to IndexedDB successfully.",
      );
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("Transaction error:", (event.target as IDBRequest).error);
      reject((event.target as IDBRequest).error);
    };

    accounts.forEach((account, index) => {
      if (!account.accountNumber) {
        console.error("Missing accountNumber for account:", account);
      } else {
        const request = store.put(account); // Ensure account has `accountNumber` as the key
        request.onsuccess = () => {
          // console.log(`Account ${index} added to IndexedDB successfully:`, account);
        };
        request.onerror = () => {
          console.error(
            `Error adding account ${index} to IndexedDB:`,
            request.error,
          );
          reject(request.error);
        };
      }
    });
  });
}

export async function getUserAccountsFromIndexedDB(): Promise<any[]> {
  const db = await openDB();
  const transaction = db.transaction(["userAccounts_v2"], "readonly");
  const store = transaction.objectStore("userAccounts_v2");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => {
      resolve(getAllRequest.result);
    };
    getAllRequest.onerror = () => {
      reject("Error getting user accounts from IndexedDB");
    };
  });
}

export const deleteAccountFromIndexedDB = async (accountNumber: string) => {
  const db = await openDB();
  const transaction = db.transaction("userAccounts", "readwrite");
  const store = transaction.objectStore("userAccounts");

  return new Promise<void>((resolve, reject) => {
    const request = store.delete(accountNumber);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error("Error deleting account from IndexedDB:", request.error);
      reject(request.error);
    };
  });
};

export const saveGoalsToIndexedDB = async (
  goals: FireStoreGalloGoalDocType[] | CompanyGoalType[],
  goalType:
    | "galloGoals"
    | "companyGoals"
    | "allGalloGoals"
    | "allCompanySpecificGoals",
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(goalType, "readwrite");
  const store = transaction.objectStore(goalType);

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      // console.log(`${goalType} saved to IndexedDB successfully.`);
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        `Error saving ${goalType} to IndexedDB:`,
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    // Clear store before saving new goals (optional for `allGalloGoals` types)
    if (goalType.startsWith("all")) {
      store.clear().onsuccess = () => {
        goals.forEach((goal) => {
          store.put({
            ...goal,
            id: goal.goalDetails?.goalId || crypto.randomUUID(), // Property 'goalDetails' does not exist on type 'FireStoreGalloGoalDocType | CompanyGoalType'.
            // Property 'goalDetails' does not exist on type 'CompanyGoalType'.ts(2339)
          });
        });
      };
    } else {
      goals.forEach((goal) => {
        store.put({
          ...goal,
          id: goal.goalDetails?.goalId || crypto.randomUUID(), // Property 'goalDetails' does not exist on type 'CompanyGoalType | FireStoreGalloGoalDocType'.
  // Property 'goalDetails' does not exist on type 'CompanyGoalType'
        });
      });
    }
  });
};

export const saveAllGalloGoalsToIndexedDB = async (
  goals: FireStoreGalloGoalDocType[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readwrite");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(
        "Error saving all Gallo goals to IndexedDB:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };

    // Clear store before saving updated data
    store.clear().onsuccess = () => {
      goals.forEach((goal) => {
        const goalWithKey = {
          ...goal,
          // goalId: goal.goalDetails.goalId, // Ensure key is explicitly included
          id: goal.goalDetails.goalId, // Ensure key is explicitly included
        };
        console.log("Saving goal:", goalWithKey);
        console.log(goalWithKey);
        store.put(goalWithKey);
      });
    };

    store.clear().onerror = (event) => {
      console.error(
        "Error clearing allGalloGoals store:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

// Fetch goals from IndexedDB
export const getUsersGalloGoalsFromIndexedDB = async (): Promise<
  FireStoreGalloGoalDocType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["galloGoals"], "readonly");
  const store = transaction.objectStore("galloGoals");

  return new Promise<FireStoreGalloGoalDocType[]>((resolve, reject) => {
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const goals = getAllRequest.result || [];
      resolve(goals as FireStoreGalloGoalDocType[]);
    };

    getAllRequest.onerror = () => {
      console.error("Error fetching goals from IndexedDB");
      reject("Error fetching goals from IndexedDB");
    };
  });
};

// Fetch goals from IndexedDB
export const getAllGalloGoalsFromIndexedDB = async (): Promise<
  FireStoreGalloGoalDocType[]
> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readonly");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<FireStoreGalloGoalDocType[]>((resolve, reject) => {
    const getAllRequest = store.getAll();

    getAllRequest.onsuccess = () => {
      const goals = getAllRequest.result as FireStoreGalloGoalDocType[];
      resolve(goals);
    };

    getAllRequest.onerror = () => {
      console.error("Error fetching all company goals from IndexedDB");
      reject("Error fetching all company goals from IndexedDB");
    };
  });
};

export const clearSomeGalloGoalsFromIndexedDB = async (
  goalIds: string[],
): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(["allGalloGoals"], "readwrite");
  const store = transaction.objectStore("allGalloGoals");

  return new Promise<void>((resolve, reject) => {
    const retainedGoals: FireStoreGalloGoalDocType[] = [];
    const request = store.getAll();

    request.onsuccess = () => {
      const allGoals = request.result as FireStoreGalloGoalDocType[];
      retainedGoals.push(
        ...allGoals.filter(
          (goal) => !goalIds.includes(goal.goalDetails.goalId),
        ),
      );

      // Clear all and repopulate retained goals
      store.clear().onsuccess = () => {
        retainedGoals.forEach((goal) => {
          store.put(goal);
        });
        resolve();
      };

      store.clear().onerror = (event) => {
        console.error(
          "Error clearing allGalloGoals store:",
          (event.target as IDBRequest).error,
        );
        reject((event.target as IDBRequest).error);
      };
    };

    request.onerror = (event) => {
      console.error(
        "Error retrieving goals for batch clear:",
        (event.target as IDBRequest).error,
      );
      reject((event.target as IDBRequest).error);
    };
  });
};

// Clear goals from IndexedDB
export const clearGoalsFromIndexedDB = async (
  goalType:
    | "galloGoals"
    | "companyGoals"
    | "allGalloGoals"
    | "allCompanySpecificGoals" = "galloGoals",
): Promise<void> => {
  // console.log(`Clearing goals from store: ${goalType}`);
  const db = await openDB();

  if (!db.objectStoreNames.contains(goalType)) {
    console.error(`Store ${goalType} does not exist in IndexedDB.`);
    return;
  }

  const transaction = db.transaction(goalType, "readwrite");
  const store = transaction.objectStore(goalType);

  try {
    await store.clear();
    // console.log(`Cleared all entries from ${goalType} in IndexedDB.`);
  } catch (error) {
    console.error(`Error clearing ${goalType} from IndexedDB:`, error);
    throw error; // Rethrow error for caller to handle
  }
};

import { ProductType } from "../types";

// Save all products to IndexedDB
export async function saveAllCompanyProductsToIndexedDB(
  products: ProductType[],
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readwrite");
  const store = transaction.objectStore("companyProducts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    products.forEach((product) => {
      if (!product.companyProductId) {
        console.warn("Missing product ID:", product);
        return;
      }
      const request = store.put(product);
      request.onerror = () => reject(request.error);
    });
  });
}

// Get all products from IndexedDB
export async function getAllCompanyProductsFromIndexedDB(): Promise<ProductType[]> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readonly");
  const store = transaction.objectStore("companyProducts");
  const getAllRequest = store.getAll();

  return new Promise((resolve, reject) => {
    getAllRequest.onsuccess = () => resolve(getAllRequest.result as ProductType[]);
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

// Clear all products from IndexedDB
export async function clearCompanyProductsFromIndexedDB(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["companyProducts"], "readwrite");
  const store = transaction.objectStore("companyProducts");

  return new Promise<void>((resolve, reject) => {
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => resolve();
    clearRequest.onerror = () => {
      console.error("Failed to clear companyProducts:", clearRequest.error);
      reject(clearRequest.error);
    };
  });
}
