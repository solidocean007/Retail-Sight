// locationSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';  // payload action is defined but never used.  why?
import { LocationState, LocationOptions } from '../utils/types'; // locationOptions is defined but never used
import { collection, getDocs } from 'firebase/firestore';
import { createSelector } from '@reduxjs/toolkit';
import { db } from '../utils/firebase';
import { RootState } from '../utils/store';



// Define a selector to get all posts (assuming it is defined elsewhere)
export const selectAllPosts = (state: RootState) => state.posts.posts;


export const fetchLocationOptions = createAsyncThunk(
  'locations/fetchOptions',
  async (_, { rejectWithValue }) => {
    try {
      const locationsCollectionRef = collection(db, "locations");
      console.log('Fetching locations from Firestore');
      const querySnapshot = await getDocs(locationsCollectionRef);
      const locations: { [key: string]: string[] } = {};
      console.log('Documents fetched:', querySnapshot.docs.length);
      querySnapshot.forEach((doc) => {
        const state = doc.id; // Get the document ID, which might be the state name
        const data = doc.data();
        console.log(`State: ${state}, Document data:`, data);
        if (data.cities) {
          locations[state] = data.cities; // Use the document ID as the key
        }
      });
      console.log('Locations object constructed:', locations);
      return locations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return rejectWithValue('Error fetching locations');
    }
  }
);

export const selectFilteredPosts = createSelector(
  [selectAllPosts, (state: RootState) => state.locations.selectedState, (state: RootState) => state.locations.selectedCity],
  (posts, selectedState, selectedCity) => {
    return posts.filter(post => {
      const matchesState = post.state === selectedState || selectedState === '';
      const matchesCity = post.city === selectedCity || selectedCity === '';
      return matchesState && matchesCity;
    });
  }
);

const initialState: LocationState = {
  locations: {},
  selectedState: '',
  selectedCity: '',
  loading: false,
  error: null,
};

// locationSlice with updated structure
const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    setStateFilter: (state, action) => {
      state.selectedState = action.payload;
    },
    setCityFilter: (state, action) => {
      state.selectedCity = action.payload;
    },
    clearLocationFilters: (state) => {
      state.selectedState = '';
      state.selectedCity = '';
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchLocationOptions.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchLocationOptions.fulfilled, (state, action) => {
      console.log('Action payload received:', action.payload);
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


