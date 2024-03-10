// indexedDBUtils.ts
import { CollectionType, PostType, PostWithID } from "../types";
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
        "Transaction complete: Data added to IndexedDB successfully."
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
          request.error
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
        transaction.error
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
        clearRequest.error
      );
      reject(clearRequest.error);
    };

    transaction.oncomplete = () => {
      console.log(
        "Transaction completed: All user created posts cleared from IndexedDB."
      );
      resolve();
    };

    transaction.onerror = () => {
      console.error(
        "Transaction not completed due to error: ",
        transaction.error
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
  post: PostWithID
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
  filters: FilterCriteria
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
        const matchesDateRange =
          !filters.dateRange ||
          (postDate &&
            filters.dateRange.startDate &&
            postDate >= filters.dateRange.startDate &&
            postDate &&
            filters.dateRange.endDate &&
            postDate <= filters.dateRange.endDate);

        return matchesChannel && matchesCategory && matchesDateRange;
      });

      resolve(filteredPosts);
    };
    getAllRequest.onerror = () => {
      reject("Error getting filtered posts from IndexedDB");
    };
  });
}

// Create a utility function that stores filtered posts in IndexedDB
export async function storeFilteredPostsInIndexedDB(
  posts: PostWithID[],
  filters: FilterCriteria
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
      // Clone the post object and add filter criteria to it
      const postWithFilters = { ...post, filters };
      const request = store.put(postWithFilters);
      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}

// store latest posts in indexDB
export async function storeLatestPostsInIndexedDB(
  posts: PostType[]
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
        getAllRequest.error
      );
      reject(getAllRequest.error);
    };
  });
}

// add hashtag posts to indexedDB
export async function addHashtagPostsToIndexedDB(
  posts: PostWithID[]
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
  posts: PostWithID[]
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
          request.error
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
        getAllRequest.error
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
        getAllRequest.error
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
        clearRequest.error
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
        clearRequest.error
      );
      reject(clearRequest.error);
    };
  });
}

// add user created posts in indexedDB
export async function addUserCreatedPostsInIndexedDB(
  userPosts: PostWithID[]
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
          request.error
        );
        reject(request.error);
      };
    });
  });
}

// delete user created posts in indexedDB
export async function deleteUserCreatedPostInIndexedDB(
  postId: string
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
        request.error
      );
      reject(request.error);
    };
  });
}

export async function addOrUpdateCollection(collection: CollectionType) {
  const db = await openDB();
  const tx = db.transaction("collections", "readwrite");
  const store = tx.objectStore("collections");
  await store.put(collection); // This will add or update a collection
  await tx.oncomplete;
  db.close();
}
