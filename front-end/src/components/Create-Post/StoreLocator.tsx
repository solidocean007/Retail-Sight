// StoreLocator.tsx
import { useEffect, useRef, useState } from "react";
import { CompanyAccountType, PostType } from "../../utils/types";
import { updateLocationsCollection } from "../../utils/PostLogic/updateLocationsCollection";
import "./storeSelector.css";
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { fetchUsersAccounts } from "../../utils/userData/fetchUserAccounts";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { Box } from "@mui/system";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface StoreLocatorProps {
  post: PostType;
  setPost: React.Dispatch<React.SetStateAction<PostType>>,
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
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);
  const [manualStoreMode, setManualStoreMode] = useState(false);
  const [accounts, setAccounts] = useState<CompanyAccountType[]>([]);
  const [matchingAccount, setMatchingAccount] =
    useState<CompanyAccountType | null>(null);
  // console.log(matchingAccount?.accountNumber);
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
    console.log(accounts); // this logs empty for no good reason sometimes
  }, []);

  useEffect(() => {
    if (isMapLoaded && post.storeAddress !== previousStoreAddressRef.current) {
      initializeMap();
    }
  }, [isMapLoaded, post.storeAddress]);

  const previousStoreAddressRef = useRef<string | undefined>();

  const loadGoogleMapsScript = () => {
    if (!window.google && !document.getElementById("googleMapsScript")) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.id = "googleMapsScript";
      window.initMap = () => setIsMapLoaded(true); // Set map loaded to true once script loads
      document.body.appendChild(script);
    } else if (window.google) {
      setIsMapLoaded(true); // Script already loaded, set map as loaded
    }
  };

  const initializeMap = () => {
    if (!window.google) {
      console.error("Google Maps script is not loaded yet.");
      return;
    }

    if (mapRef.current) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 34.0522, lng: -118.2437 },
        zoom: 18,
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(({ coords }) => {
          map.setCenter({ lat: coords.latitude, lng: coords.longitude });
        });
      }

      map.addListener("click", (e) => handleMapClick(e.latLng, map));
      previousStoreAddressRef.current = post.storeAddress;
    }
  };

  useEffect(() => {
    if (isMapLoaded && post.storeAddress !== previousStoreAddressRef.current) {
      initializeMap();
    }
  }, [isMapLoaded, post.storeAddress]);

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
          const firstResult = results[0];
          if (firstResult.place_id) {
            fetchCityAndState(firstResult.place_id, (city, state) => {
              updateStoreDetails(
                firstResult.name || "",
                firstResult.vicinity || "",
                city,
                state
              );
              updateLocationsCollection(state, city);

              // Attempt to find the closest matching account in IndexedDB
              matchAccountWithSelectedStore(
                firstResult.name || "",
                firstResult.vicinity || ""
              );
            });
            setSelectedPlace(firstResult);
          }
        }
      }
    );
  };

  const fetchCityAndState = (
    placeId: string,
    callback: (city: string, state: string) => void
  ) => {
    // Ensure mapRef is not null and is a google.maps.Map instance
    const map = mapRef.current as google.maps.Map | null;

    if (!map) {
      console.error("Map is not initialized.");
      return;
    }

    const service = new google.maps.places.PlacesService(map);
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
    onStoreNumberChange(""); // Reset store number when a new store is selected
  };

  const matchAccountWithSelectedStore = (name: string, address: string) => {
    const normalizedAddress = address
      .toLowerCase()
      .replace(/\s/g, "")
      .substring(0, 10);
  
    console.log("Matching address:", normalizedAddress);
  
    // Log all normalized addresses for comparison
    accounts.forEach((account) => {
      const normalizedAccountAddress = account.accountAddress
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 10);
  
      console.log(`Comparing: ${normalizedAddress} === ${normalizedAccountAddress}`);
    });
  
    const foundAccount = accounts.find((account) => {
      const normalizedAccountAddress = account.accountAddress
        .toLowerCase()
        .replace(/\s/g, "")
        .substring(0, 10);
      return normalizedAccountAddress === normalizedAddress;
    });
  
    if (foundAccount) {
      console.log("Match found:", foundAccount);
  
      setMatchingAccount(foundAccount); // Set matched account in state
      onStoreNameChange(foundAccount.accountName); // Set full account name
  
      // Update the post with the matching accountNumber
      setPost((prev) => ({
        ...prev,
        accountNumber: foundAccount.accountNumber.toString(),
      }));
    } else {
      console.log("No matching account found.");
      setMatchingAccount(null);
  
      // Reset accountNumber to null if no match is found
      setPost((prev) => ({ ...prev, accountNumber: null }));
    }
  };
  

  const clearSelection = () => {
    setSelectedPlace(null);
    setMatchingAccount(null);
    onStoreNameChange(""); // Clear store name
    onStoreAddressChange(""); // Clear store address
    onStoreNumberChange(""); // Clear store number
  };

  const handleManualModeToggle = () => setManualStoreMode(true);

  const handleInputChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  return (
    <div className="map-container">
      <div>
        <h4>3. Click store or</h4>
        <button onClick={handleManualModeToggle}>Enter manually</button>
        {matchingAccount && (
          <button onClick={clearSelection}>Clear Selection</button>
        )}
      </div>

      <div className="store-input-box">
        <div className="store-name-and-number">
          <div className="input-field">
            <label htmlFor="store-name">Store name:</label>
            <input
              id="store-name"
              type="text"
              value={
                matchingAccount?.accountName ||
                post.selectedStore ||
                selectedPlace?.name ||
                ""
              }
              onChange={handleInputChange(onStoreNameChange)}
              placeholder="Store name"
              readOnly={!!matchingAccount} // Make read-only if a match was found
            />
          </div>

          {/* Only show store number input if no matching account was found */}
          {!matchingAccount && (
            <div className="input-field">
              <label htmlFor="store-number">Store number:</label>
              <input
                id="store-number"
                type="text"
                value={post.storeNumber}
                onChange={handleInputChange(onStoreNumberChange)}
                placeholder="Store number"
              />
            </div>
          )}
        </div>

        <div className="store-address-input-box">
          <div className="input-field">
            <label htmlFor="store-address">Store address:</label>
            <input
              id="store-address"
              type="text"
              value={post.storeAddress}
              onChange={handleInputChange(onStoreAddressChange)}
              placeholder="Store address"
            />
          </div>
        </div>
      </div>

      {/* Keep the map visible */}
      <div
        className="map-box"
        ref={mapRef}
        style={{ width: "350px", height: "300px" }}
      ></div>
    </div>
  );
};

export default StoreLocator;
