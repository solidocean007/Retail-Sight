// utils/normalize.ts
import { Timestamp } from "firebase/firestore";
import { DeveloperNotificationType, UserNotificationType } from "./types";

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
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v?.toDate === "function") return v.toDate();
  return null;
};

export function normalizeUserNotification(
  raw: UserNotificationType
): UserNotificationType {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt) as any,
    readAt: toDate(raw.readAt) as any,
    interactedAt: toDate(raw.interactedAt) as any,
    deliveredVia: raw.deliveredVia,
  };
}

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

const toISO = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
};

export function normalizeDeveloperNotification(raw: any): DeveloperNotificationType {
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    priority: raw.priority ?? "normal",

    recipientCompanyIds: raw.recipientCompanyIds ?? [],
    recipientUserIds: raw.recipientUserIds ?? [],
    recipientRoles: raw.recipientRoles ?? [],

    createdAt: toDate(raw.createdAt)?.toISOString() ?? null,
    scheduledAt: toDate(raw.scheduledAt)?.toISOString() ?? null,
    sentAt: toDate(raw.sentAt)?.toISOString() ?? null,

    createdBy: raw.createdBy,
    channels: raw.channels ?? { inApp: true, email: false },

    audience:
      raw.audience ??
      (raw.recipientCompanyIds?.length ? "targeted" : "all"),
  };
}

