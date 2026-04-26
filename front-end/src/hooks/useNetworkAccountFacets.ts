// hooks/useNetworkAccountFacets.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useSelector } from "react-redux";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";
import { CompanyAccountType } from "../utils/types";
import {
  getNetworkAccountFacetsRecord,
  isCacheFresh,
  NetworkAccountFacet,
  saveNetworkAccountFacetsRecord,
  toNetworkAccountFacets,
} from "../utils/database/networkFilterCacheDB";

type ConnectedCompany = {
  companyId: string;
  companyName: string;
};

const MAX_ACCOUNT_NAME_RESULTS = 50;
const MIN_ACCOUNT_SEARCH_LENGTH = 2;

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

    const companyId = isFrom
      ? conn.requestToCompanyId
      : conn.requestFromCompanyId;

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

const normalizeText = (value?: string | null) =>
  value?.toLowerCase().replace(/[\s\-#]+/g, "").trim() || "";

const normalizeAccountFacets = (
  accounts: CompanyAccountType[],
  originCompanyId: string,
  originCompanyName: string
): NetworkAccountFacet[] => {
  return toNetworkAccountFacets(
    accounts,
    originCompanyId,
    originCompanyName
  ).filter(
    (facet) =>
      facet.accountName ||
      facet.accountNumber ||
      facet.accountType ||
      facet.chain ||
      facet.chainType ||
      facet.city ||
      facet.state
  );
};

const fetchCompanyFacets = async (
  company: ConnectedCompany
): Promise<NetworkAccountFacet[]> => {
  const companySnap = await getDoc(doc(db, "companies", company.companyId));

  if (!companySnap.exists()) return [];

  const companyData = companySnap.data();

  const accountsId = companyData.accountsId as string | undefined;
  const companyName =
    (companyData.companyName as string | undefined) ||
    company.companyName ||
    "Connected Company";

  if (!accountsId) return [];

  const accountsSnap = await getDoc(doc(db, "accounts", accountsId));

  if (!accountsSnap.exists()) return [];

  const accountsData = accountsSnap.data();
  const accounts = (accountsData.accounts || []) as CompanyAccountType[];

  const freshFacets = normalizeAccountFacets(
    accounts,
    company.companyId,
    companyName
  );

  await saveNetworkAccountFacetsRecord({
    companyId: company.companyId,
    companyName,
    accountsId,
    facets: freshFacets,
    fetchedAt: new Date().toISOString(),
  });

  return freshFacets;
};

export function useNetworkAccountFacets(enabled: boolean) {
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

  const [facets, setFacets] = useState<NetworkAccountFacet[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || connectedCompanies.length === 0) {
      setFacets([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const cachedFacets: NetworkAccountFacet[] = [];
        const companiesToFetch: ConnectedCompany[] = [];

        for (const company of connectedCompanies) {
          const cached = await getNetworkAccountFacetsRecord(company.companyId);

          if (cached && isCacheFresh(cached.fetchedAt)) {
            cachedFacets.push(...cached.facets);
          } else {
            companiesToFetch.push(company);
          }
        }

        let freshFacets: NetworkAccountFacet[] = [];

        if (companiesToFetch.length > 0) {
          const results = await Promise.allSettled(
            companiesToFetch.map((company) => fetchCompanyFacets(company))
          );

          freshFacets = results.flatMap((result) =>
            result.status === "fulfilled" ? result.value : []
          );
        }

        if (!cancelled) {
          setFacets([...cachedFacets, ...freshFacets]);
        }
      } catch (err) {
        console.error(
          "[useNetworkAccountFacets] Failed to load network account facets:",
          err
        );

        if (!cancelled) setFacets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, connectedCompanies]);

  const accountTypes = useMemo(() => {
    return Array.from(
      new Set(facets.map((f) => f.accountType?.trim()).filter(Boolean))
    ).sort() as string[];
  }, [facets]);

  const chains = useMemo(() => {
    return Array.from(
      new Set(facets.map((f) => f.chain?.trim()).filter(Boolean))
    ).sort() as string[];
  }, [facets]);

  const chainTypes = useMemo(() => {
    return Array.from(
      new Set(facets.map((f) => f.chainType?.trim()).filter(Boolean))
    ).sort() as string[];
  }, [facets]);

  const getAccountNameOptions = useCallback(
    (input: string): NetworkAccountFacet[] => {
      const search = normalizeText(input);

      if (search.length < MIN_ACCOUNT_SEARCH_LENGTH) {
        return [];
      }

      const map = new Map<string, NetworkAccountFacet>();

      for (const facet of facets) {
        if (!facet.accountName) continue;

        const normalizedName = normalizeText(facet.accountName);
        const normalizedNumber = normalizeText(facet.accountNumber);
        const normalizedCompany = normalizeText(facet.originCompanyName);

        const matches =
          normalizedName.includes(search) ||
          normalizedNumber.includes(search) ||
          normalizedCompany.includes(search);

        if (!matches) continue;

        const key = `${facet.originCompanyId}:${facet.accountNumber || facet.accountName}`;
        map.set(key, facet);

        if (map.size >= MAX_ACCOUNT_NAME_RESULTS) break;
      }

      return Array.from(map.values()).sort((a, b) =>
        (a.accountName || "").localeCompare(b.accountName || "")
      );
    },
    [facets]
  );

  return {
    facets,
    accountTypes,
    chains,
    chainTypes,
    getAccountNameOptions,
    loading,
  };
}