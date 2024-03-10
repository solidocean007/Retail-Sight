import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CollectionType } from "../utils/types";

interface CollectionsState {
  collections: {[key: string]: CollectionType};
}

const initialState: CollectionsState = {
  collections: {},
};

const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    addCollection: (state, action: PayloadAction<CollectionType>) => {
      const collection = action.payload;
      state.collections[collection.id] = collection;
      // Optionally, update IndexedDB here or call a separate function
    },
    // Additional reducers for updating and deleting collections...
  },
});

export const { addCollection } = collectionsSlice.actions;
export default collectionsSlice.reducer;
