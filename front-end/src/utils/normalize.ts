// utils/normalize.ts
import { Timestamp } from "firebase/firestore";
import { NotificationType } from "../utils/types";

const tsToISO = (v: unknown): string | null => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === "string") return v;
  return null;
};

export function normalizeNotification(raw: any, id?: string): NotificationType {
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
