// utils/normalize.ts
import { Timestamp } from "firebase/firestore";
import { NotificationType } from "../utils/types";

const tsToISO = (v: unknown): string | null => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return null;
};

export function normalizeNotificationOld(raw: any, id?: string): NotificationType {
  const sentBy = raw?.sentBy;
  const normalizedSentBy =
    sentBy && typeof sentBy === "object"
      ? {
          ...sentBy,
          createdAt: tsToISO(sentBy.createdAt),
          updatedAt: tsToISO(sentBy.updatedAt),
        }
      : sentBy; // allow plain uid string if that's what you store

  return {
    ...raw,
    id: id ?? raw.id,
    sentAt: tsToISO(raw.sentAt),
    sentBy: normalizedSentBy,
    recipientCompanyIds: raw.recipientCompanyIds ?? [],
    recipientUserIds: raw.recipientUserIds ?? [],
    recipientRoles: raw.recipientRoles ?? [],
    postId: raw.postId ?? "",
  } as NotificationType;
}


/** 🔁 Universal Firestore data normalizer
 * Converts all Firestore Timestamp or Timestamp-like objects to ISO strings.
 * Works recursively for deeply nested fields (billing, posts, goals, etc.).
 */
export const normalizeFirestoreData = <T>(input: T): T => {
  const walk = (val: any): any => {
    if (val instanceof Timestamp) return val.toDate().toISOString();
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === "object") {
      const out: any = {};
      for (const [k, v2] of Object.entries(val)) out[k] = walk(v2);
      return out;
    }
    return val;
  };
  return walk(input);
};
