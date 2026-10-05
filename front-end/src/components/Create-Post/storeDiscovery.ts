import { httpsCallable } from "firebase/functions";

import { functions } from "../../utils/firebase";
import { CompanyAccountType } from "../../utils/types";

export interface NearbyStoreCandidate {
  name: string;
  address: string;
  placeId?: string;
}

const connectedStoreCache = new Map<
  string,
  { accounts: CompanyAccountType[]; loadedAt: number }
>();

export const getConnectedStores = async (companyId: string) => {
  const cached = connectedStoreCache.get(companyId);
  if (cached && Date.now() - cached.loadedAt < 5 * 60 * 1000) {
    return cached.accounts;
  }

  const request = httpsCallable<
    { distributorCompanyId: string },
    { stores: CompanyAccountType[] }
  >(functions, "getConnectedDistributorStores");
  const response = await request({ distributorCompanyId: companyId });
  const accounts = response.data.stores ?? [];

  connectedStoreCache.set(companyId, {
    accounts,
    loadedAt: Date.now(),
  });

  return accounts;
};

export const getNearbyStores = async (
  lat: number,
  lng: number,
  googleKey: string,
  signal?: AbortSignal,
): Promise<NearbyStoreCandidate[]> => {
  if (!googleKey) {
    throw new Error("Store locator is missing the Google Maps API key.");
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.id,places.types,places.primaryType",
      },
      body: JSON.stringify({
        includedTypes: [
          "store",
          "convenience_store",
          "supermarket",
          "grocery_store",
          "liquor_store",
          "department_store",
        ],
        maxResultCount: 5,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 2000,
          },
        },
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Nearby store lookup failed.");
  }

  return (data?.places ?? []).map((place: any) => ({
    name: place.displayName?.text ?? "Nearby store",
    address: place.formattedAddress ?? "",
    placeId: place.id,
  }));
};
