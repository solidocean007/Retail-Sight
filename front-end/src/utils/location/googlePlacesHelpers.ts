export const fetchCityAndState = (
  placeId: string,
  callback: (city: string, state: string) => void
) => {
  const service = new google.maps.places.PlacesService(document.createElement("div"));
  service.getDetails({ placeId, fields: ["address_components"] }, (result, status) => {
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
    } else {
      callback("", "");
    }
  });
};
