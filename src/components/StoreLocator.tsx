import { useEffect, useRef, useState } from "react";
import { PostType } from "../utils/types";

// Assuming you've refactored the GOOGLE_MAPS_KEY import using Vite
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// interface StoreLocatorProps {
//   setSelectedStore: (
//     store: google.maps.places.PlaceResult,
//     storeAddress: string
//   ) => void;
// }

interface StoreLocatorProps {
  post: PostType;
  handleSelectedStore: (storeName: string, storeAddress: string) => void
}

declare global {
  interface Window {
    initMap: () => void;
  }
}

// const StoreLocator: React.FC<StoreLocatorProps> = ({ setSelectedStore }) => {
const StoreLocator: React.FC<StoreLocatorProps> = ({ post, handleSelectedStore } ) => {
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

  // Initialize map, set to user's current location, and add a click listener
  useEffect(() => {
    renderCountLoc.current += 1;
    console.log(
      `useEffect for user location has run ${renderCountLoc.current} times.`
    );
    if (isMapLoaded && mapRef.current) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: -34.397, lng: 150.644 }, // default center, will be updated with user location
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

      map.addListener("click", (e) => {
        service.nearbySearch(
          {
            location: e.latLng,
            radius: 30,
            type: "store" as string,
          },
          (results, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results.length > 0
            ) {
              const firstResult = results[0];
              setSelectedPlace(firstResult);
              // setSelectedStore(firstResult, firstResult.vicinity || "");
              handleSelectedStore(firstResult.name || "", firstResult.vicinity || "");
            }
          }
        );
      });
    }
  }, [isMapLoaded, handleSelectedStore]);

  return (
    <div>
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