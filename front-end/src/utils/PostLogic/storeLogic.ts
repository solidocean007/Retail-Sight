export const handleSelectedStoreLogic = (
  store: google.maps.places.PlaceResult,
  storeAddress: string,
  setSelectedStore: (store: any) => void,
) => {
  setSelectedStore({
    storeName: store.name,
    storeAddress: storeAddress,
  });
};
