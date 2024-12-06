// StoreLocator.tsx
import { useEffect, useRef, useState } from "react";
import { CompanyAccountType, PostType } from "../../utils/types";
import { updateLocationsCollection } from "../../utils/PostLogic/updateLocationsCollection";
import "./storeSelector.css";
import { getUserAccountsFromIndexedDB } from "../../utils/database/indexedDBUtils";
import { fetchUsersAccounts } from "../../utils/userData/fetchUsersAccounts";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import CheckBoxModal from "../CheckBoxModal";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

declare global {
  interface Window {
    initMap: () => void;
  }
}

interface StoreLocatorProps {
  onStoreSelect: (store: {
    name: string;
    address: string;
    city: string;
    state: string;
    placeId: string;
  }) => void;
}

const StoreLocator: React.FC<StoreLocatorProps> = ({ onStoreSelect }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [closestMatches, setClosestMatches] = useState<
  { name: string; address: string; placeId: string }[]
>([]);
  const [isPlaceSelectionOpen, setIsPlaceSelectionOpen] = useState(false);

  useEffect(() => {
    loadGoogleMapsScript();
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
          const validResults = results
          .filter((place) => place.place_id && place.name && place.vicinity)
          .map((place) => ({
            name: place.name!,
            address: place.vicinity!, // Map vicinity to address
            placeId: place.place_id!,
          }))
          .slice(0, 4); // Limit to the first 4 places

          console.log("Closest matches:", validResults); // Log closest matches
  
          if (validResults.length > 1) {
            setClosestMatches(validResults);
            setIsPlaceSelectionOpen(true); // Open the dialog for selection
          } else if (validResults.length === 1) {
            processStoreSelection(validResults[0]); // Argument of type '{ name: string; address: string; placeId: string; }' is not assignable to parameter of type '{ name: string; vicinity: string; placeId: string; }'.
            // Property 'vicinity' is missing in type '{ name: string; address: string; placeId: string; }' but required in type '{ name: string; vicinity: string; placeId: string; }'.ts(2345)
          // StoreLocator.tsx(122, 5): 'vicinity' is declared here.
          } else {
            console.warn("No valid places found.");
          }
        } else {
          console.error("Nearby search failed with status:", status);
        }
      }
    );
  };

  // useEffect(() => {
  //   console.log("Selected store updated: ", selectedStore); // cannot find name selectedStore
  // }, [selectedStore]);


  const processStoreSelection = (place: {
    name: string;
    address: string; // Updated from vicinity to address
    placeId: string;
  }) => {
    fetchCityAndState(place.placeId, (city, state) => {
      console.log("Selected store data:", { ...place, city, state }); // Log store data
      onStoreSelect({
        name: place.name,
        address: place.address, // Now matches the validResults mapping
        city,
        state, 
        placeId: place.placeId,
      });
      updateLocationsCollection(state, city);
    });
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

  const handlePlaceSelection = (place: { name: string; address: string; placeId: string }) => {
    setIsPlaceSelectionOpen(false);
  
    fetchCityAndState(place.placeId, (city, state) => {
      onStoreSelect({
        name: place.name,
        address: place.address,
        city,
        state,
        placeId: place.placeId,
      });
    });
    
  };
  

  return (
    <div className="map-container">
      <div ref={mapRef} style={{ width: "100%", height: "400px" }}></div>
      {isPlaceSelectionOpen && (
        <Dialog
          open={isPlaceSelectionOpen}
          onClose={() => setIsPlaceSelectionOpen(false)}
        >
          <DialogTitle>Store location by address</DialogTitle>
          <DialogContent>
            <List>
            <List>
            {closestMatches.map((place) => (
              <ListItem key={place.placeId}>
                <ListItemButton onClick={() => handlePlaceSelection(place)}>
                  {/* <CheckBoxModal/> */}
                  <ListItemText primary={place.name} secondary={place.address} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsPlaceSelectionOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

export default StoreLocator;