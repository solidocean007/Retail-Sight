import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";
import { UserType } from "../utils/types";
import {
  getNetworkUsersRecord,
  isCacheFresh,
  saveNetworkUsersRecord,
} from "../utils/database/networkFilterCacheDB";

export type NetworkUserOption = UserType & {
  originCompanyId: string;
  originCompanyName: string;
};

type ConnectedCompany = {
  companyId: string;
  companyName: string;
};

const getConnectedCompanies = (
  connections: any[],
  currentCompanyId?: string | null
): ConnectedCompany[] => {
  if (!currentCompanyId) return [];

  const map = new Map<string, string>();

  connections.forEach((conn) => {
    if (conn.status !== "approved") return;

    const isFrom = conn.requestFromCompanyId === currentCompanyId;
    const isTo = conn.requestToCompanyId === currentCompanyId;

    if (!isFrom && !isTo) return;

    const companyId = isFrom ? conn.requestToCompanyId : conn.requestFromCompanyId;

    const companyName = isFrom
      ? conn.requestToCompanyName
      : conn.requestFromCompanyName;

    if (!companyId || companyId === currentCompanyId) return;

    map.set(companyId, companyName || "Connected Company");
  });

  return Array.from(map.entries()).map(([companyId, companyName]) => ({
    companyId,
    companyName,
  }));
};

export function useNetworkUsers(enabled: boolean) {
  const currentCompanyId = useSelector(
    (s: RootState) => s.user.currentUser?.companyId
  );

  const connections = useSelector(
    (s: RootState) => s.companyConnections.connections || []
  );

  const connectedCompanies = useMemo(
    () => getConnectedCompanies(connections, currentCompanyId),
    [connections, currentCompanyId]
  );

  const [users, setUsers] = useState<NetworkUserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || connectedCompanies.length === 0) {
      setUsers([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const merged: NetworkUserOption[] = [];

        for (const company of connectedCompanies) {
          const cached = await getNetworkUsersRecord(company.companyId);

          if (cached && isCacheFresh(cached.fetchedAt)) {
            merged.push(
              ...(cached.users as UserType[]).map((u) => ({
                ...u,
                uid: u.uid,
                originCompanyId: company.companyId,
                originCompanyName: company.companyName,
              }))
            );
            continue;
          }

          const q = query(
            collection(db, "users"),
            where("companyId", "==", company.companyId)
          );

          const snap = await getDocs(q);

          const freshUsers = snap.docs.map((docSnap) => {
            const data = docSnap.data() as UserType;
            return {
              ...data,
              uid: data.uid || docSnap.id,
            };
          });

          await saveNetworkUsersRecord({
            companyId: company.companyId,
            companyName: company.companyName,
            users: freshUsers,
            fetchedAt: new Date().toISOString(),
          });

          merged.push(
            ...freshUsers.map((u) => ({
              ...u,
              originCompanyId: company.companyId,
              originCompanyName: company.companyName,
            }))
          );
        }

        if (!cancelled) {
          setUsers(
            merged.sort((a, b) => {
              const companyCompare = a.originCompanyName.localeCompare(
                b.originCompanyName
              );

              if (companyCompare !== 0) return companyCompare;

              return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(
                `${b.firstName || ""} ${b.lastName || ""}`
              );
            })
          );
        }
      } catch (err) {
        console.error("[useNetworkUsers] Failed to load network users:", err);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, connectedCompanies]);

  return { users, loading };
}