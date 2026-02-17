import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";
import { DeveloperNotificationType } from "../utils/types";
import { normalizeDeveloperNotification } from "../utils/normalize";

export const fetchDeveloperNotifications = createAsyncThunk<
  DeveloperNotificationType[]
>("developerNotifications/fetch", async () => {
  const q = query(
    collection(db, "developerNotifications"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) =>
    normalizeDeveloperNotification({
      id: d.id,
      ...d.data(),
    })
  );
});
