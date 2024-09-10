// // StoreLocator
// import { useEffect, useRef, useState } from "react";
// import { PostType } from "../utils/types";
// import { updateLocationsCollection } from "../utils/PostLogic/updateLocationsCollection";
// import "./storeSelector.css";

// // Assuming you've refactored the GOOGLE_MAPS_KEY import using Vite
// const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// interface StoreLocatorProps {
//   post: PostType;
//   onStoreNameChange: (storeName: string) => void;
//   onStoreNumberChange: (newStoreNumber: string) => void;
//   onStoreAddressChange: (address: string) => void;
//   onStoreCityChange: (city: string) => void;
//   onStoreStateChange: (newStoreState: string) => void;
// }

// declare global {
//   interface Window {
//     initMap: () => void;
//   }
// }

// const StoreLocator: React.FC<StoreLocatorProps> = ({
//   post,
//   onStoreNameChange,
//   onStoreNumberChange,
//   onStoreAddressChange,
//   onStoreCityChange,
//   onStoreStateChange,
// }) => {
//   const mapRef = useRef<HTMLDivElement | null>(null);
//   const [isMapLoaded, setIsMapLoaded] = useState(false);
//   const [selectedPlace, setSelectedPlace] =
//     useState<google.maps.places.PlaceResult | null>(null);
//   const [manualStoreMode, setManualStoreMode] = useState(false);

//   const handleManualSelection = () => {
//     setManualStoreMode(true);
//   };

//   // Function to handle store name input changes
//   const handleStoreNameInputChange = (
//     e: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     const newName = e.target.value;
//     setSelectedPlace((prevSelectedPlace) => ({
//       ...prevSelectedPlace,
//       name: newName,
//     }));
//     onStoreNameChange(newName);
//   };

//   // Function to handle store number input changes
//   const handleStoreNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     onStoreNumberChange(e.target.value);
//   };

//   // Load Google Maps script
//   useEffect(() => {
//     // Check if Google Maps API is already available on window object
//     if (!window.google) {
//       const existingScript = document.getElementById("googleMapsScript");
//       if (!existingScript) {
//         // Load the Google Maps script only if it hasn't been loaded
//         const script = document.createElement("script");
//         script.type = "text/javascript";
//         script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&callback=initMap`;
//         script.async = true;
//         script.defer = true;

//         window.initMap = () => setIsMapLoaded(true);

//         document.body.appendChild(script);
//         script.id = "googleMapsScript";
//         return () => {
//           document.body.removeChild(script);
//         };
//       } else {
//         setIsMapLoaded(true);
//       }
//     } else {
//       // If Google Maps API is already available, set map as loaded
//       setIsMapLoaded(true);
//     }
//   }, []);

//   // Use a ref to keep track of the previous value of the address:
//   const previousStoreAddressRef = useRef<string | undefined>();

//   interface PlaceResult extends google.maps.places.PlaceResult {
//     address_components?: google.maps.GeocoderAddressComponent[];
//   }

//   // The updated useEffect hook
//   useEffect(() => {
//     // Function to update store details when a store is selected on the map
//     const updateStoreDetails = (
//       name: string,
//       address: string,
//       city: string,
//       state: string
//     ) => {
//       onStoreNameChange(name);
//       onStoreAddressChange(address);
//       onStoreCityChange(city);
//       onStoreStateChange(state);
//       // Reset the store number when a new store is selected
//       onStoreNumberChange("");
//     };

//     if (post.storeAddress !== previousStoreAddressRef.current) {
//       if (isMapLoaded && mapRef.current) {
//         const map = new google.maps.Map(mapRef.current, {
//           center: { lat: 34.0522, lng: -118.2437 },
//           zoom: 18,
//         });

//         // Set map to user's current location
//         if (navigator.geolocation) {
//           navigator.geolocation.getCurrentPosition((position) => {
//             const pos = {
//               lat: position.coords.latitude,
//               lng: position.coords.longitude,
//             };
//             map.setCenter(pos);
//           });
//         }

//         const service = new google.maps.places.PlacesService(map);
//         // Function to fetch city and state using the place_id
//         const fetchCityAndState = (
//           placeId: string,
//           callback: (state: string, city: string) => void
//         ) => {
//           service.getDetails(
//             {
//               placeId: placeId,
//               fields: ["address_components"],
//             },
//             (result: PlaceResult, status) => {
//               if (status === google.maps.places.PlacesServiceStatus.OK) {
//                 const addressComponents = result.address_components;
//                 if (addressComponents) {
//                   const cityComponent = addressComponents.find((component) =>
//                     component.types.includes("locality")
//                   );
//                   const stateComponent = addressComponents.find((component) =>
//                     component.types.includes("administrative_area_level_1")
//                   );

//                   const city = cityComponent ? cityComponent.long_name : "";
//                   const state = stateComponent ? stateComponent.short_name : "";
//                   console.log(state, city);
//                   // Call the callback with the city and state
//                   callback(state, city);
//                 }
//               }
//             }
//           );
//         };

//         map.addListener("click", (e) => {
//           service.nearbySearch(
//             {
//               location: e.latLng,
//               radius: 30,
//               type: "store",
//             },
//             (
//               results: google.maps.places.PlaceResult[],
//               status: google.maps.places.PlacesServiceStatus
//             ) => {
//               if (
//                 status === google.maps.places.PlacesServiceStatus.OK &&
//                 results &&
//                 results.length > 0
//               ) {
//                 const firstResult = results[0] as PlaceResult;
//                 setSelectedPlace(firstResult);

//                 // Retrieve city and state for the clicked place
//                 if (firstResult.place_id) {
//                   fetchCityAndState(
//                     firstResult.place_id,
//                     (fetchedState, fetchedCity) => {
//                       // Use updateStoreDetails to update store information
//                       updateStoreDetails(
//                         firstResult.name || "",
//                         firstResult.vicinity || "",
//                         fetchedCity,
//                         fetchedState
//                       );
//                       // Update Firestore with the new location data
//                       updateLocationsCollection(fetchedState, fetchedCity);
//                     }
//                   );
//                 } else {
//                   console.error("Place ID is undefined.");
//                 }
//               }
//             }
//           );
//         });

//         previousStoreAddressRef.current = post.storeAddress;
//       }
//     }
//   }, [
//     isMapLoaded,
//     post.storeAddress,
//     onStoreNumberChange,
//     onStoreAddressChange,
//     onStoreCityChange,
//     onStoreNameChange,
//     onStoreStateChange,
//   ]);
//   return (
//     <div className="map-container">
//       <h4>3. Click store or</h4>
//       <button onClick={handleManualSelection}>enter manually</button>
//       {(post.selectedStore || manualStoreMode) && (
//         <div className="store-input-box">
//           <div className="store-name-input-box">
//             <p>Store name:</p>
//             <input
//               id="store-name"
//               title="store-name"
//               placeholder="Store name"
//               type="text"
//               value={selectedPlace?.name || post.selectedStore}
//               onChange={handleStoreNameInputChange}
//             />
//           </div>
//           <div className="store-number-input-box">
//             <p>Store number:</p>
//             <input
//               id="store-number"
//               title="store-number"
//               type="text"
//               value={post.storeNumber}
//               placeholder="Number"
//               onChange={handleStoreNumberChange}
//             />
//           </div>
//         </div>
//       )}
//       <div
//         className="map-box"
//         ref={mapRef}
//         style={{ width: "350px", height: "300px" }}
//       ></div>
//     </div>
//   );
// };

// export default StoreLocator;

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
