// locationSlice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { RootState } from '../utils/store';
import { db } from '../utils/firebase';
import { LocationState } from '../utils/types';

// Define a selector to get all posts (assuming it is defined elsewhere)
// now that im storing posts in indexDB maybe I should store these locations there also?
// can I cut down on firestore reads by doing this?
export const selectAllPosts = (state: RootState) => state.posts.posts;

export const fetchLocationOptions = createAsyncThunk(
  'locations/fetchOptions',
  async (_, { rejectWithValue }) => {
    try {
      const locationsCollectionRef = collection(db, "locations");
      console.log('Fetching locations from Firestore read');
      const querySnapshot = await getDocs(locationsCollectionRef);
      const locations: { [key: string]: string[] } = {};
      // console.log('Documents fetched:', querySnapshot.docs.length);
      querySnapshot.forEach((doc) => {
        const state = doc.id; // Get the document ID, which might be the state name
        const data = doc.data();
        // console.log(`State: ${state}, Document data:`, data);
        if (data.cities) {
          locations[state] = data.cities; // Use the document ID as the key
        }
      });
      // console.log('Locations object constructed:', locations);
      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return rejectWithValue('Error fetching locations');
    }
  }
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
  name: 'locations',
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
  },
  extraReducers: (builder) => {
    builder.addCase(fetchLocationOptions.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchLocationOptions.fulfilled, (state, action: PayloadAction<{ [key: string]: string[] }>) => {
      state.locations = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchLocationOptions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'An error occurred';
    });
  }
});

export const { setStateFilter, setCityFilter, clearLocationFilters } = locationSlice.actions;

export default locationSlice.reducer;
