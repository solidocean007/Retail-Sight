import { getDistance } from "geolib";
import { CompanyAccountType } from "../types";

export async function autoDetectStore(
  accounts: CompanyAccountType[]
): Promise<CompanyAccountType | null> {
  if (!navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const userLoc = { latitude: coords.latitude, longitude: coords.longitude };
        const nearby = accounts
          .map((acc) => {
            if (!acc.lat || !acc.lng) return null;
            const distance = getDistance(userLoc, { latitude: acc.lat, longitude: acc.lng });
            return { ...acc, distance };
          })
          .filter(Boolean)
          .sort((a, b) => a!.distance - b!.distance);

        resolve(nearby[0] || null);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}
