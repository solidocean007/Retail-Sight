// utils/normalizeTimestamps.ts
import { Timestamp } from "firebase/firestore";

const isTimestampLike = (v: any): v is { toDate: () => Date } =>
  v &&
  typeof v === "object" &&
  typeof v.toDate === "function" &&
  "seconds" in v;


export function normalizeTimestampsOld<T>(input: T): T {
  const walk = (val: any): any => {
    if (val instanceof Timestamp || isTimestampLike(val)) {
      return val.toDate().toISOString();
    }
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === "object") {
      const out: any = {};
      for (const [k, v2] of Object.entries(val)) out[k] = walk(v2);
      return out;
    }
    return val;
  };
  return walk(input);
}
