// thunks/developerNotificationsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { normalizeFirestoreData } from "../utils/normalize";
import { NotificationType } from "../utils/types";

export const fetchDeveloperNotifications = createAsyncThunk<NotificationType[]>(
  "developerNotifications/fetch",
  async () => {
    const q = query(
      collection(db, "developerNotifications"),
      orderBy("createdAt", "desc"),
    );

    const snap = await getDocs(q);

    return snap.docs.map(
      (d) =>
        normalizeFirestoreData({
          id: d.id,
          ...d.data(),
        }) as NotificationType,
    );
  },
);
