// StoreLocator.tsx
import { useEffect, useRef, useState } from "react";
import { CompanyAccountType, PostType } from "../../utils/types";
import { updateLocationsCollection } from "../../utils/PostLogic/updateLocationsCollection";
import "./storeSelector.css";
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { fetchUsersAccounts } from "../../utils/userData/fetchUsersAccounts";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface StoreLocatorProps {
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>;
  onStoreNameChange: (storeName: string) => void;
  onStoreNumberChange: (newStoreNumber: string) => void;
  onStoreAddressChange: (address: string) => void;
  onStoreCityChange: (city: string) => void;
  onStoreStateChange: (newStoreState: string) => void;
}

declare global {
  interface Window {
    initMap: () => void;
  }
}

const StoreLocator: React.FC<StoreLocatorProps> = ({
  post,
  setPost,
  onStoreNameChange,
  onStoreNumberChange,
  onStoreAddressChange,
  onStoreCityChange,
  onStoreStateChange,
}) => {
  const [nearbyPlaces, setNearbyPlaces] = useState<
    { name: string; vicinity: string; placeId: string }[]
  >([]);
  const [isPlaceSelectionOpen, setIsPlaceSelectionOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);

  const user = useSelector(selectUser);

  useEffect(() => {
    loadGoogleMapsScript();

    const setUserAccounts = async () => {
      const accountsInIndexedDB = await getUserAccountsFromIndexedDB();

      if (accountsInIndexedDB.length > 0) {
        setAccounts(accountsInIndexedDB);
      } else if (user?.companyId && user?.salesRouteNum) {
        console.log("Fetching accounts from Firestore...");
        await fetchUsersAccounts(user.companyId, user.salesRouteNum);
      }
    };

    setUserAccounts();
  }, []);

  const loadGoogleMapsScript = () => {
    if (!window.google && !document.getElementById("googleMapsScript")) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.id = "googleMapsScript";
      window.initMap = () => setIsMapLoaded(true);
      document.body.appendChild(script);
    } else if (window.google) {
      setIsMapLoaded(true);
    }
  };

  useEffect(() => {
    if (isMapLoaded && mapRef.current && !mapInstanceRef.current) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 34.0522, lng: -118.2437 },
        zoom: 18,
      });
      mapInstanceRef.current = map;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          map.setCenter({ lat: coords.latitude, lng: coords.longitude });
        });
      }

      map.addListener("click", (e) => handleMapClick(e.latLng, map));
    }
  }, [isMapLoaded]);

  const handleMapClick = (
    location: google.maps.LatLng,
    map: google.maps.Map
  ) => {
    const service = new google.maps.places.PlacesService(map);

    service.nearbySearch(
      {
        location,
        radius: 30,
        type: "store",
      },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results.length > 0
        ) {
          console.log("Nearby places fetched from Google Maps:", results);

          const validResults = results
            .filter((place) => place.place_id && place.name && place.vicinity)

            .map((place) => ({
              name: place.name!,
              vicinity: place.vicinity!,
              placeId: place.place_id!,
            }));

          if (validResults.length > 1) {
            setNearbyPlaces(validResults);
            setIsPlaceSelectionOpen(true); // Open the dialog for selection
          } else if (validResults.length === 1) {
            processStoreSelection(validResults[0], map); // Process single result
          } else {
            console.warn("No valid places found.");
          }
        } else {
          console.error("Nearby search failed with status:", status);
        }
      }
    );
  };

  const processStoreSelection = (
    place: { name: string; vicinity: string; placeId: string },
    map: google.maps.Map
  ) => {
    console.log("Selected place:", place); // Inspect the selected place object

    if (!place.placeId) {
      // Ensure the `placeId` is available
      console.error("Missing placeId:", place); // Log an error if placeId is missing
      return;
    }

    const service = new google.maps.places.PlacesService(map);

    service.getDetails(
      {
        placeId: place.placeId, // Use `placeId` from the `place` object
        fields: ["name", "vicinity", "address_components"],
      },
      (result, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && result) {
          console.log("Result from getDetails:", result); // Debugging log

          // Fallback to the original `placeId` if `result` does not contain `place_id`
          const resolvedPlaceId = result.place_id || place.placeId;

          fetchCityAndState(resolvedPlaceId, (city, state) => {
            updateStoreDetails(
              result.name || "",
              result.vicinity || "",
              city,
              state
            );
            updateLocationsCollection(state, city);
            matchAccountWithSelectedStore(
              result.name || "",
              result.vicinity || ""
            );
          });
        } else {
          console.error(
            "getDetails failed with status:",
            status,
            "and result:",
            result
          );
        }
      }
    );
  };

  const fetchCityAndState = (
    placeId: string,
    callback: (city: string, state: string) => void
  ) => {
    if (!mapInstanceRef.current) return;

    const service = new google.maps.places.PlacesService(
      mapInstanceRef.current
    );
    service.getDetails(
      { placeId, fields: ["address_components"] },
      (result, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          result?.address_components
        ) {
          const city =
            result.address_components.find((c) => c.types.includes("locality"))
              ?.long_name || "";
          const state =
            result.address_components.find((s) =>
              s.types.includes("administrative_area_level_1")
            )?.short_name || "";
          callback(city, state);
        }
      }
    );
  };

  const updateStoreDetails = (
    name: string,
    address: string,
    city: string,
    state: string
  ) => {
    onStoreNameChange(name);
    onStoreAddressChange(address);
    onStoreCityChange(city);
    onStoreStateChange(state);
    onStoreNumberChange("");
  };

  const matchAccountWithSelectedStore = (name: string, address: string) => {
    const normalizedAddress = address
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 10);
    const normalizedName = name
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 5);

    console.log("Normalized selected address:", normalizedAddress);
    console.log("Normalized selected name:", normalizedName);

    accounts.forEach((account) => {
      console.log(
        `Account being checked: Address: "${account.accountAddress}", Name: "${account.accountName}"`
      );

      // const normalizedAccountAddress = account.accountAddress
      //   .toLowerCase()
      //   .replace(/\s/g, "")
      //   .substring(0, 10);
      // const normalizedAccountName = account.accountName
      //   .toLowerCase()
      //   .replace(/\s/g, "")
      //   .substring(0, 5);
    });

    const foundAccount = accounts.find((account) => {
      const normalizedAccountAddress = account.accountAddress
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 10);
      const normalizedAccountName = account.accountName
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 5);

      return (
        normalizedAccountAddress === normalizedAddress &&
        normalizedAccountName === normalizedName
      );
    });

    if (foundAccount) {
      console.log("Match found:", foundAccount);
      setPost((prev) => ({
        ...prev,
        accountNumber: foundAccount.accountNumber.toString(),
      }));
      onStoreNameChange(foundAccount.accountName);
    } else {
      console.log("No matching account found.");
      setPost((prev) => ({ ...prev, accountNumber: null }));
    }
  };

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ width: "100%", height: "400px" }}></div>
      {isPlaceSelectionOpen && (
        <div className="place-selection-dialog">
          <h3>Select a Store</h3>
          <ul>
            {nearbyPlaces.map((place, index) => (
              <li key={index}>
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      processStoreSelection(place, mapInstanceRef.current); // Use the map instance
                      setIsPlaceSelectionOpen(false); // Close the dialog
                    } else {
                      console.error("Map instance is not available");
                    }
                  }}
                >
                  {place.name} - {place.vicinity}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setIsPlaceSelectionOpen(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default StoreLocator;
