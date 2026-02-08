// thunks/developerNotificationsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { DeveloperNotificationType } from "../utils/types";

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  return null;
};

export const fetchDeveloperNotifications = createAsyncThunk<
  DeveloperNotificationType[]
>("developerNotifications/fetch", async () => {
  const q = query(
    collection(db, "developerNotifications"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();

    return {
      id: d.id,
      title: data.title,
      message: data.message,
      priority: data.priority ?? "normal",

      recipientCompanyIds: data.recipientCompanyIds ?? [],
      recipientUserIds: data.recipientUserIds ?? [],

      createdAt: toDate(data.createdAt),
      scheduledAt: toDate(data.scheduledAt),
      sentAt: toDate(data.sentAt),

      createdBy: data.createdBy,

      channels: data.channels ?? {
        inApp: true,
        email: false,
      },
    } as DeveloperNotificationType;
  });
});
