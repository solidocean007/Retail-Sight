// hooks/useAvailableFilterUsers.ts
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";
import { selectCompanyUsers } from "../Slices/userSlice";
import { selectIsSupplier } from "../Slices/currentCompanySlice";
import { UserType } from "../utils/types";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";

export type FilterUserOption = UserType & {
  originCompanyId?: string;
  originCompanyName?: string;
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function useAvailableFilterUsers(isSharedFeed: boolean) {
  const isSupplier = useSelector(selectIsSupplier);
  const ownCompanyUsers = useSelector(selectCompanyUsers) || [];
  const connections = useSelector(
    (s: RootState) => s.companyConnections.connections || [],
  );

  const currentCompanyId = useSelector(
    (s: RootState) => s.user.currentUser?.companyId,
  );

  const [networkUsers, setNetworkUsers] = useState<FilterUserOption[]>([]);
  const [loading, setLoading] = useState(false);

  // seems like this useffect could be optimized by  the current connections slice by just returning the connected companies in the selector
  const connectedCompanies = useMemo(() => {
    if (!currentCompanyId || !isSupplier || !isSharedFeed) return [];

    const map = new Map<string, string>();

    connections.forEach((conn: any) => {
      if (conn.status !== "approved") return;

      const otherCompanyId =
        conn.requestFromCompanyId === currentCompanyId
          ? conn.requestToCompanyId
          : conn.requestFromCompanyId;

      if (!otherCompanyId || otherCompanyId === currentCompanyId) return;

      const otherCompanyName =
        conn.requestFromCompanyId === currentCompanyId
          ? conn.requestToCompanyName
          : conn.requestFromCompanyName;

      map.set(otherCompanyId, otherCompanyName || "Connected Company");
    });

    return Array.from(map.entries()).map(([companyId, companyName]) => ({
      companyId,
      companyName,
    }));
  }, [connections, currentCompanyId, isSupplier, isSharedFeed]);

  useEffect(() => {
    if (!isSupplier || !isSharedFeed || connectedCompanies.length === 0) {
      setNetworkUsers([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const allUsers: FilterUserOption[] = [];
        const companiesToFetch: typeof connectedCompanies = [];

        // 1. Try IndexedDB first, company by company
        for (const company of connectedCompanies) {
          const cached = await getCompanyUsersFromIndexedDB(company.companyId);

          if (cached?.length) {
            allUsers.push(
              ...cached.map((u) => ({
                ...u,
                originCompanyId: u.companyId || company.companyId,
                originCompanyName: company.companyName,
              })),
            );
          } else {
            companiesToFetch.push(company);
          }
        }

        // 2. Fetch only missing companies
        for (const companyBatch of chunk(companiesToFetch, 10)) {
          const ids = companyBatch.map((c) => c.companyId);

          const companyNameById = new Map(
            companyBatch.map((c) => [c.companyId, c.companyName]),
          );

          const q = query(
            collection(db, "users"),
            where("companyId", "in", ids),
          );

          const snap = await getDocs(q);

          const usersByCompany = new Map<string, UserType[]>();

          snap.forEach((docSnap) => {
            const data = docSnap.data() as UserType;
            const user = {
              ...data,
              uid: data.uid || docSnap.id,
            };

            if (!user.companyId) return;

            const list = usersByCompany.get(user.companyId) || [];
            list.push(user);
            usersByCompany.set(user.companyId, list);

            allUsers.push({
              ...user,
              originCompanyId: user.companyId,
              originCompanyName: companyNameById.get(user.companyId),
            });
          });

          // 3. Save fetched users back to IndexedDB by company
          for (const [companyId, users] of usersByCompany.entries()) {
            await saveCompanyUsersToIndexedDB(companyId, users);
          }
        }

        if (!cancelled) {
          const deduped = new Map<string, FilterUserOption>();

          allUsers.forEach((u) => {
            if (!u.uid) return;
            deduped.set(u.uid, u);
          });

          setNetworkUsers(
            Array.from(deduped.values()).sort((a, b) => {
              const companyCompare = (a.originCompanyName || "").localeCompare(
                b.originCompanyName || "",
              );

              if (companyCompare !== 0) return companyCompare;

              return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(
                `${b.firstName || ""} ${b.lastName || ""}`,
              );
            }),
          );
        }
      } catch (err) {
        console.error("[useAvailableFilterUsers] Failed to load users:", err);
        if (!cancelled) setNetworkUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isSupplier, isSharedFeed, connectedCompanies]);

  const users = useMemo(() => {
    if (!isSupplier || !isSharedFeed) {
      return ownCompanyUsers.map((u) => ({
        ...u,
        originCompanyId: u.companyId,
        originCompanyName: "Your Company",
      }));
    }

    const ownUsers = ownCompanyUsers.map((u) => ({
      ...u,
      originCompanyId: u.companyId,
      originCompanyName: "Your Company",
    }));

    const map = new Map<string, FilterUserOption>();

    [...ownUsers, ...networkUsers].forEach((u) => {
      if (!u.uid) return;
      map.set(u.uid, u);
    });

    return Array.from(map.values()).sort((a, b) => {
      const companyCompare = (a.originCompanyName || "").localeCompare(
        b.originCompanyName || "",
      );

      if (companyCompare !== 0) return companyCompare;

      return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(
        `${b.firstName || ""} ${b.lastName || ""}`,
      );
    });
  }, [isSupplier, isSharedFeed, networkUsers, ownCompanyUsers]);

  return { users, loading };
}
