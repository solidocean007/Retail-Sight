import React, { useState, useEffect } from 'react';
import { loadGoogleMaps } from '../utils/GoogleMaps';

const StoreLocator: React.FC<{ onLocationSelect: (location) => void }> = ({ onLocationSelect }) => {
  const [map, setMap] = useState(null);
  
  useEffect(()=> {
    loadGoogleMaps();
  },[])

  // Initialize the map
  const initMap = () => {
    const myMap = new google.maps.Map(document.getElementById('map'), {
      center: { lat: -34.397, lng: 150.644 }, // Default to some location
      zoom: 15,
    });
    setMap(myMap);
  };

  // Search for stores nearby when a location is clicked
  const searchStores = (location) => {
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
      location: location,
      radius: '500',
      type: ['store'], 
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        // You can process the results here - maybe show them in a dropdown or a list
        // Call onLocationSelect with the selected store location (and any other info you need)
      }
    });
  };

  // Hook up the map click event
  if (map) {
    map.addListener('click', (e) => {
      searchStores(e.latLng.toJSON());
    });
  }

  return (
    <div id="map" style={{ width: '100%', height: '400px' }}></div>
  );
};

export default StoreLocator;
