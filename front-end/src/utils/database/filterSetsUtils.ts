import {
  doesPostMatchFilter,
  getFilterHash,
} from "../../components/FilterSideBar/utils/filterUtils";
import { PostQueryFilters, PostWithID } from "../types";
import { openDB } from "./indexedDBOpen";
import { getLastSeenTimestamp } from "./indexedDBUtils";

export async function storeFilteredSet(
  filters: PostQueryFilters,
  posts: PostWithID[]
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readwrite");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);
  const record = {
    id,
    filters,
    posts,
    fetchedAt: new Date().toISOString(),
  };

  await new Promise<void>((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getFilteredSet(
  filters: PostQueryFilters
): Promise<PostWithID[] | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.posts ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getFetchDate(
  filters: PostQueryFilters
): Promise<Date | null> {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readonly");
  const store = tx.objectStore("filteredSets");

  const id = getFilterHash(filters);

  return await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => {
      const result = req.result;
      resolve(result?.fetchedAt ? new Date(result.fetchedAt) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function purgeDeletedPostFromFilteredSets(postId: string) {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readwrite");
  const store = tx.objectStore("filteredSets");

  const keysReq = store.getAllKeys();

  await new Promise<void>((resolve, reject) => {
    keysReq.onsuccess = async () => {
      const allKeys = keysReq.result;
      for (const key of allKeys) {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record || !Array.isArray(record.posts)) return;

          const filtered = record.posts.filter((p: PostWithID) => p.id !== postId);

          if (filtered.length !== record.posts.length) {
            if (filtered.length === 0) {
              // if no posts remain for this filter, just drop the set
              store.delete(key);
            } else {
              store.put({ ...record, posts: filtered });
            }
          }
        };
      }
      resolve();
    };
    keysReq.onerror = () => reject(keysReq.error);
  });
}


export async function shouldRefetch(
  filters: PostQueryFilters,
  newestRawIso: string | null
): Promise<boolean> {
  if (!newestRawIso) return true;

  const fetchedAt = await getFetchDate(filters);
  if (!fetchedAt) return true;

  const newestRawDate = new Date(newestRawIso);
  return newestRawDate > fetchedAt;
}

export async function updatePostInFilteredSets(updatedPost: PostWithID) {
  const db = await openDB();
  const tx = db.transaction("filteredSets", "readwrite");
  const store = tx.objectStore("filteredSets");

  const keysReq = store.getAllKeys();

  await new Promise<void>((resolve, reject) => {
    keysReq.onsuccess = async () => {
      const allKeys = keysReq.result;
      for (const key of allKeys) {
        const getReq = store.get(key);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record || !Array.isArray(record.posts)) return;

          const posts: PostWithID[] = record.posts;
          const matchesOld = posts.some((p) => p.id === updatedPost.id);
          const stillQualifies = doesPostMatchFilter(
            updatedPost,
            record.filters
          );

          let newPosts = posts;

          if (matchesOld && stillQualifies) {
            newPosts = posts.map((p) =>
              p.id === updatedPost.id ? updatedPost : p
            );
          } else if (matchesOld && !stillQualifies) {
            newPosts = posts.filter((p) => p.id !== updatedPost.id);
          } else if (!matchesOld && stillQualifies) {
            newPosts = [...posts, updatedPost];
          }

          if (newPosts !== posts) {
            store.put({ ...record, posts: newPosts });
          }
        };
      }
      resolve();
    };
    keysReq.onerror = () => reject(keysReq.error);
  });
}


/**
 * Decide if we should refetch a timeline feed (distributor, supplier, highlighted).
 * @param key cache key (e.g. "company:abc")
 * @param newestIso ISO string from the newest cached post
 */
export async function shouldRefetchTimeline(
  key: string,
  newestIso: string | null
): Promise<boolean> {
  if (!newestIso) return true;

  const lastSeen = await getLastSeenTimestamp(key);
  if (!lastSeen) return true;

  const newest = new Date(newestIso);
  const last = new Date(parseInt(lastSeen, 10));

  return newest > last;
}