// locationSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';  // payload action is defined but never used.  why?
import { LocationState, LocationOptions } from '../utils/types';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';


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





// Initial state with types
const initialState: LocationState = {
  locations: {}, // 'states' and 'cities' are now within a single 'locations' object
  loading: false,
  error: null,
};

// locationSlice with updated structure
const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    // Add reducers for other sync actions if necessary
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

export default locationSlice.reducer;


