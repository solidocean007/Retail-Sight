// usersThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { UserType } from "../utils/types";

const STALE_MS = 60_000; // 1 minute

type UserWithId = UserType & { id: string };

const userCache: Record<
  string,
  { timestamp: number; data: UserWithId[] }
> = {};

// ─────────────────────────────────────────────
export const fetchCompanyUsersFromFirestore = createAsyncThunk<
  UserWithId[],
  string,
  { rejectValue: string }
>("user/fetchCompanyUsers", async (companyId, { rejectWithValue }) => {
  const now = Date.now();
  const entry = userCache[companyId];

  if (entry && now - entry.timestamp < STALE_MS) {
    return entry.data; // cached
  }

  try {
    const usersQuery = query(
      collection(db, "users"),
      where("companyId", "==", companyId)
    );

    const snap = await getDocs(usersQuery);
    const users: UserWithId[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as UserType),
    }));

    userCache[companyId] = { timestamp: now, data: users };
    return users;
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch company users";
    return rejectWithValue(msg);
  }
});
