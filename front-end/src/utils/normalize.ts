// utils/normalize.ts
import { Timestamp } from "firebase/firestore";

/** 🔁 Universal Firestore normalizer (Timestamp → ms) */
export const normalizeFirestoreData = <T>(input: T): T => {
  const walk = (val: any): any => {
    if (val instanceof Timestamp) return val.toDate().toISOString();
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(val)) out[k] = walk(v);
      return out;
    }
    return val;
  };
  return walk(input);
};

/** 📨 Notification normalizer (keeps ID as 2nd arg for backward compatibility) */
export const normalizeNotification = (raw: any, id?: string) => {
  const data = normalizeFirestoreData(raw);
  return {
    id: id ?? raw.id, // preserve id if provided
    ...data,
  };
};

/** 📝 Works with `.map(normalizePost)` or called manually */
export const normalizePost = (raw: any, indexOrId?: string | number) => {
  const data = normalizeFirestoreData(raw);

  // If it's being used in .map(), indexOrId will be a number
  // If it's called manually, indexOrId may be a Firestore doc ID
  const id = typeof indexOrId === "string" ? indexOrId : (raw.id ?? undefined); // fallback to existing id

  return {
    id,
    ...data,
  };
};
