import React, { useState, useEffect } from "react";
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    initMap?: () => void;
  }
}

const StoreLocator: React.FC = () => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const centerMapOnUserLocation = (mapInstance: google.maps.Map) => {
    console.log("Attempting to center on user's location...");

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        console.log("User location fetched:", userLocation);

        if (mapInstance) {
          console.log("Setting map center to user's location");
          mapInstance.setCenter(userLocation);
          new google.maps.Marker({
            position: userLocation,
            map: mapInstance,
            title: "You are here!",
          });
        } else {
          console.warn("Map reference not found while trying to center!");
        }
      },
      (error) => {
        console.error("Error retrieving your location", error);
      }
    );
  };

  const initMap = () => {
    console.log("Initializing the map...");

    if (!window.google) {
      console.warn("Google Maps library not loaded yet.");
      return;
    }

    const defaultLocation = { lat: 80.397, lng: 100.644 };

    const myMap = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        center: defaultLocation,
        zoom: 15,
      }
    );

    console.log("Map initialized with default location:", defaultLocation);

    setMap(myMap);
    console.log("Map reference set to state.");

    myMap.addListener("click", (e) => {
      searchStores(e.latLng.toJSON());
    });

    delete window.initMap;

    // Use the map reference directly to center on user location.
    centerMapOnUserLocation(myMap);
  };

  const loadGoogleMaps = () => {
    console.log("Initiating Google Maps script loading...");

    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initMap`}"]`
    );

    if (existingScript) {
      console.log("Attempted to load Google Maps script again.");
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initMap`;
    document.body.appendChild(script);

    window.initMap = initMap;
  };

  useEffect(() => {
    loadGoogleMaps();
  }, []);  // If the linter warns about missing dependencies, you can safely ignore it for this line since loadGoogleMaps does not have external dependencies.

  const searchStores = (location: { lat: number; lng: number }) => {
    if (!map) return;

    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch(
      {
        location,
        radius: "500",
        type: ["store"],
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Process results here
        }
      }
    );
  };

  return <div id="map" style={{ width: "100%", height: "400px" }}></div>;
};

export default StoreLocator;



