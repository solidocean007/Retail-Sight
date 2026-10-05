import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { setAllAccounts } from "../../Slices/allAccountsSlice";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import { selectUser } from "../../Slices/userSlice";
import {
  getAllCompanyAccountsFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  getConnectedStores,
  getNearbyStores,
  NearbyStoreCandidate,
} from "./storeDiscovery";

interface UseEarlyStorePrefetchArgs {
  userLocation: { lat: number; lng: number } | null;
}

export const useEarlyStorePrefetch = ({
  userLocation,
}: UseEarlyStorePrefetchArgs) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const isSupplier = useSelector(selectIsSupplier);
  const connections = useSelector(
    (state: RootState) => state.companyConnections.connections,
  );
  const allAccounts = useSelector(
    (state: RootState) => state.allAccounts.accounts,
  );
  const shouldWarmAllAccounts =
    !isSupplier && ["admin", "super-admin", "supervisor"].includes(user?.role || "");
  const [nearbyStores, setNearbyStores] = useState<
    NearbyStoreCandidate[] | null
  >(null);
  const [isFindingNearbyStores, setIsFindingNearbyStores] = useState(false);
  const [nearbyStoreError, setNearbyStoreError] = useState("");

  const distributorPartnerIds = useMemo(() => {
    if (!isSupplier || !user?.companyId) return [];

    return Array.from(
      new Set(
        connections.flatMap((connection) => {
          if (connection.status !== "approved") return [];
          if (
            connection.requestFromCompanyId === user.companyId &&
            connection.requestToCompanyType === "distributor"
          ) {
            return [connection.requestToCompanyId];
          }
          if (
            connection.requestToCompanyId === user.companyId &&
            connection.requestFromCompanyType === "distributor"
          ) {
            return [connection.requestFromCompanyId];
          }
          return [];
        }),
      ),
    );
  }, [connections, isSupplier, user?.companyId]);

  useEffect(() => {
    if (!shouldWarmAllAccounts || !user?.companyId || allAccounts.length > 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const cached = await getAllCompanyAccountsFromIndexedDB();
      if (cancelled) return;
      if (cached.length > 0) {
        dispatch(setAllAccounts(cached));
        return;
      }

      const fresh = await fetchAllCompanyAccounts(user.companyId);
      if (cancelled) return;
      dispatch(setAllAccounts(fresh));
      await saveAllCompanyAccountsToIndexedDB(fresh);
    })().catch((error) => {
      console.warn("Create Post account prefetch failed:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    allAccounts.length,
    dispatch,
    shouldWarmAllAccounts,
    user?.companyId,
  ]);

  useEffect(() => {
    if (distributorPartnerIds.length === 0) return;
    void Promise.allSettled(distributorPartnerIds.map(getConnectedStores));
  }, [distributorPartnerIds]);

  useEffect(() => {
    if (!userLocation) return;

    const controller = new AbortController();
    setIsFindingNearbyStores(true);
    setNearbyStoreError("");

    void getNearbyStores(
      userLocation.lat,
      userLocation.lng,
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
      controller.signal,
    )
      .then(setNearbyStores)
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.warn("Create Post nearby-store prefetch failed:", error);
        setNearbyStores([]);
        setNearbyStoreError(
          error instanceof Error ? error.message : "Nearby store lookup failed.",
        );
      })
      .finally(() => setIsFindingNearbyStores(false));

    return () => controller.abort();
  }, [userLocation]);

  return {
    nearbyStores,
    isFindingNearbyStores,
    nearbyStoreError,
  };
};
