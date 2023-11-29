// StoreLocator
import { useEffect, useRef, useState } from "react";
import { PostType } from "../utils/types";
import { updateLocationsCollection } from "../utils/PostLogic/updateLocationsCollection";
import './storeSelector.css'

// Assuming you've refactored the GOOGLE_MAPS_KEY import using Vite
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface StoreLocatorProps {
  post: PostType;
  handleSelectedStore: (
    storeName: string,
    storeAddress: string,
    state?: string,
    city?: string
  ) => void;
}

declare global {
  interface Window {
    initMap: () => void;
  }
}

const StoreLocator: React.FC<StoreLocatorProps> = ({
  post,
  handleSelectedStore,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.PlaceResult | null>(null);

  const renderCountMap = useRef(0);
  const renderCountLoc = useRef(0);

  useEffect(() => {
    console.log("Component mounted!");
    return () => {
      console.log("Component unmounted!");
    };
  }, []);

  // Load Google Maps script
  useEffect(() => {
    renderCountMap.current += 1;
    console.log(`useEffect for map has run ${renderCountMap.current} times.`);
    // Check if Google Maps API is already available on window object
    if (!window.google) {
      const existingScript = document.getElementById("googleMapsScript");
      if (!existingScript) {
        // Load the Google Maps script only if it hasn't been loaded
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;

        window.initMap = () => setIsMapLoaded(true);

        document.body.appendChild(script);
        script.id = "googleMapsScript";
        return () => {
          document.body.removeChild(script);
        };
      } else {
        setIsMapLoaded(true);
      }
    } else {
      // If Google Maps API is already available, set map as loaded
      setIsMapLoaded(true);
    }
  }, []);

  // Use a ref to keep track of the previous value of the address:
  const previousStoreAddressRef = useRef<string | undefined>();

  interface PlaceResult extends google.maps.places.PlaceResult {
    address_components?: google.maps.GeocoderAddressComponent[];
  }

  // The updated useEffect hook
  useEffect(() => {
    if (post.storeAddress !== previousStoreAddressRef.current) {
      renderCountLoc.current += 1;
      console.log(
        `useEffect for user location has run ${renderCountLoc.current} times.`
      );
      if (isMapLoaded && mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 34.0522, lng: -118.2437 },
          zoom: 15,
        });

        // Set map to user's current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.setCenter(pos);
          });
        }

        const service = new google.maps.places.PlacesService(map);
        // Function to fetch city and state using the place_id
        const fetchCityAndState = (
          placeId: string,
          callback: (state: string, city: string) => void
        ) => {
          service.getDetails(
            {
              placeId: placeId,
              fields: ["address_components"],
            },
            (result: PlaceResult, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK) {
                const addressComponents = result.address_components;
                if (addressComponents) {
                  const cityComponent = addressComponents.find((component) =>
                    component.types.includes("locality")
                  );
                  const stateComponent = addressComponents.find((component) =>
                    component.types.includes("administrative_area_level_1")
                  );

                  const city = cityComponent ? cityComponent.long_name : "";
                  const state = stateComponent ? stateComponent.short_name : "";

                  // Call the callback with the city and state
                  callback(state, city);
                }
              }
            }
          );
        };

        map.addListener("click", (e) => {
          service.nearbySearch(
            {
              location: e.latLng,
              radius: 30,
              type: "store",
            },
            (
              results: google.maps.places.PlaceResult[],
              status: google.maps.places.PlacesServiceStatus
            ) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                results &&
                results.length > 0
              ) {
                const firstResult = results[0] as PlaceResult;
                setSelectedPlace(firstResult);

                // Retrieve city and state for the clicked place
                if (firstResult.place_id) {
                  fetchCityAndState(
                    firstResult.place_id,
                    (fetchedState, fetchedCity) => {
                      // Now that we have the state and city, handle the store selection
                      handleSelectedStore(
                        firstResult.name || "",
                        firstResult.vicinity || "",
                        fetchedState,
                        fetchedCity
                      );
                      // Update Firestore with the new location data
                      updateLocationsCollection(fetchedState, fetchedCity);
                    }
                  );
                } else {
                  console.error("Place ID is undefined.");
                }
              }
            }
          );
        });

        previousStoreAddressRef.current = post.storeAddress;
      }
    }
  }, [isMapLoaded, handleSelectedStore, post.storeAddress]);

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ width: "300px", height: "200px" }}></div>
      <input
        type="text"
        // value={selectedPlace?.name || ""}
        value={post.selectedStore}
        onChange={(e) =>
          handleSelectedStore(e.target.value, selectedPlace?.vicinity || "")
        }
      />
    </div>
  );
};

export default StoreLocator;
