// StoreLocator.tsx
import { useEffect, useRef, useState } from "react";
import { PostType } from "../utils/types";
import { updateLocationsCollection } from "../utils/PostLogic/updateLocationsCollection";
import "./storeSelector.css";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface StoreLocatorProps {
  post: PostType;
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

  useEffect(() => {
    loadGoogleMapsScript();
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
      window.initMap = () => setIsMapLoaded(true);
      document.body.appendChild(script);
    } else {
      setIsMapLoaded(true);
    }
  };

  const initializeMap = () => {
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

  const handleManualModeToggle = () => setManualStoreMode(true);

  const handleInputChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  return (
    <div className="map-container">
      {/* test */}
      {!selectedPlace && (
        <div>
          <h4>3. Click store or</h4>
          <button onClick={handleManualModeToggle}>Enter manually</button>
        </div>
      )}
      {(post.selectedStore || manualStoreMode) && (
        <div className="store-input-box">
          <div className="store-name-and-number">
            <div className="input-field">
              <label htmlFor="store-name">Store name:</label>
              <input
                id="store-name"
                type="text"
                value={selectedPlace?.name || post.selectedStore}
                onChange={handleInputChange(onStoreNameChange)}
                placeholder="Store name"
              />
            </div>
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
      )}
      <div
        className="map-box"
        ref={mapRef}
        style={{ width: "350px", height: "300px" }}
      ></div>
    </div>
  );
};

export default StoreLocator;
