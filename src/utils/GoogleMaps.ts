const functions = require('firebase-functions'); // Require statement not part of import statement.

const GOOGLE_MAPS_KEY = functions.config().googlemaps.key;


export const loadGoogleMaps = (callback) => {
  const script = document.createElement("script");
  script.type = "text/javascript";

  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
  script.onload = callback;

  document.body.appendChild(script);
};
