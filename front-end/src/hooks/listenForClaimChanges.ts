import { onSnapshot, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../utils/firebase";

type UserDocClaims = {
  role?: string | null;
  companyId?: string | null;
  claimsVersion?: number | null; // optional but recommended
};

export function listenForClaimChanges(uid: string) {
  const auth = getAuth();

  let lastRole: string | null | undefined;
  let lastCompanyId: string | null | undefined;
  let lastClaimsVersion: number | null | undefined;

  // serialize refreshes (prevents overlapping calls if snapshots arrive quickly)
  let refreshing: Promise<void> | null = null;

  return onSnapshot(doc(db, "users", uid), async (snap) => {
    if (!snap.exists()) return;

    const data = snap.data() as UserDocClaims;

    const role = data.role ?? null;
    const companyId = data.companyId ?? null;
    const claimsVersion = data.claimsVersion ?? null;

    const first = lastRole === undefined && lastCompanyId === undefined && lastClaimsVersion === undefined;

    const changed =
      !first &&
      (role !== lastRole ||
        companyId !== lastCompanyId ||
        claimsVersion !== lastClaimsVersion);

    lastRole = role;
    lastCompanyId = companyId;
    lastClaimsVersion = claimsVersion;

    if (first) return; // don’t force refresh on initial load

    if (!changed) return;

    const user = auth.currentUser;
    if (!user) return;

    refreshing ??= user.getIdToken(true).finally(() => { // Type 'string' is not assignable to type 'void'
      refreshing = null;
    });

    await refreshing;
  });
}