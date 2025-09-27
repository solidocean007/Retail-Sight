// indexedDBUtils.ts
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "@firebase/firestore";
import { PostQueryFilters, PostType, PostWithID } from "../types";
import { openDB } from "./indexedDBOpen";
import { db } from "../firebase";

const refetchMemo = new Map<string, string>(); // companyId → lastCheckedDisplayDate


export async function shouldRefetchPosts(
  companyId: string,
  newestCachedDate: string | null
): Promise<boolean> {
  try {
    if (!companyId || !newestCachedDate) return true;

    const lastChecked = refetchMemo.get(companyId);
    if (lastChecked === newestCachedDate) {
      console.log(`[Memo] Skipping shouldRefetch for ${companyId}`);
      return false;
    }

    const postsRef = collection(db, "posts");

    const [companySnap, publicSnap] = await Promise.all([
      getDocs(
        query(
          postsRef,
          where("postUserCompanyId", "==", companyId),
          orderBy("displayDate", "desc"),
          limit(1)
        )
      ),
      getDocs(
        query(
          postsRef,
          where("visibility", "==", "public"),
          orderBy("displayDate", "desc"),
          limit(1)
        )
      ),
    ]);

    const latestDates: Date[] = [];

    if (!companySnap.empty) {
      latestDates.push(new Date(companySnap.docs[0].data().displayDate));
    }
    if (!publicSnap.empty) {
      latestDates.push(new Date(publicSnap.docs[0].data().displayDate));
    }

    const newestLocal = new Date(newestCachedDate);
    const hasNewer = latestDates.some((d) => d > newestLocal);

    if (!hasNewer) {
      refetchMemo.set(companyId, newestCachedDate);
    }

    return hasNewer;
  } catch (err) {
    console.error("[shouldRefetch] Error:", err);
    return true; // Safe default
  }
}

// export async function addPostsToIndexedDB(posts: PostType[]): Promise<void> {
export async function addPostsToIndexedDB(posts: PostWithID[]): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    // Handle the successful completion of the transaction
    transaction.oncomplete = () => {
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
  filters: PostQueryFilters
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
        // const matchesChannel =
        //   !filters.channel ||
        //   filters.channel.length === 0 ||
        //   filters.channel.includes(post.channel);
        // const matchesCategory =
        //   !filters.category ||
        //   filters.category.length === 0 ||
        //   filters.category.includes(post.category);
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

        // return matchesChannel && matchesCategory && matchesDateRange;
        return matchesDateRange;
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
  filters: PostQueryFilters
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(["posts"], "readwrite");
  const store = transaction.objectStore("posts");

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("[CACHE] Storing", posts.length, "posts in IndexedDB");

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



