// locationSlice
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { collection, getDocs } from "firebase/firestore";
import { RootState } from "../utils/store";
import { db } from "../utils/firebase";
import { LocationState } from "../utils/types";
import {
  getLocationsFromIndexedDB,
  storeLocationsInIndexedDB,
} from "../utils/database/indexedDBUtils";
// Define a selector to get all posts (assuming it is defined elsewhere)
// now that im storing posts in indexDB maybe I should store these locations there also?
// can I cut down on firestore reads by doing this?
export const selectAllPosts = (state: RootState) => state.posts.posts;

export const fetchLocationOptions = createAsyncThunk(
  // this does too much
  "locations/fetchOptions",
  async (_, { rejectWithValue }) => {
    try {
      const cachedLocations = await getLocationsFromIndexedDB();
      if (cachedLocations) {
        return cachedLocations;
      }

      // Data not in cache, fetch from Firestore

      const locationsCollectionRef = collection(db, "locations");
      const querySnapshot = await getDocs(locationsCollectionRef);

      const locations: { [key: string]: string[] } = {};
      querySnapshot.forEach((doc) => {
        const state = doc.id;
        const data = doc.data();
        if (data.cities) {
          locations[state] = data.cities;
        }
      });

      // Save the fetched data to IndexedDB
      await storeLocationsInIndexedDB(locations);

      return locations;
    } catch (error) {
      return rejectWithValue("Error fetching locations");
    }
  },
);

const initialState: LocationState = {
  locations: {},
  selectedStates: [],
  selectedCities: [],
  loading: false,
  error: null,
};

// locationSlice with updated structure
const locationSlice = createSlice({
  name: "locations",
  initialState,
  reducers: {
    setStateFilter: (state, action: PayloadAction<string[]>) => {
      state.selectedStates = action.payload;
    },
    setCityFilter: (state, action: PayloadAction<string[]>) => {
      state.selectedCities = action.payload;
    },
    clearLocationFilters: (state) => {
      state.selectedStates = [];
      state.selectedCities = [];
    },
    clearLocations: (state) => {
      state.locations = {};
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchLocationOptions.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(
      fetchLocationOptions.fulfilled,
      (state, action: PayloadAction<{ [key: string]: string[] }>) => {
        state.locations = action.payload;
        state.loading = false;
      },
    );
    builder.addCase(fetchLocationOptions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || "An error occurred";
    });
  },
});

export const {
  setStateFilter,
  setCityFilter,
  clearLocationFilters,
  clearLocations,
} = locationSlice.actions;

export default locationSlice.reducer;
