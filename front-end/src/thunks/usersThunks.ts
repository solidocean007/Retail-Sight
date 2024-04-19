// usersThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

const userCache: { [companyId: string]: { timestamp: number; data: UserType[] } } = {};

export const fetchCompanyUsersFromFirestore = createAsyncThunk<UserType[], string, { rejectValue: string }>(
  'user/fetchCompanyUsers',
  async (companyId, { rejectWithValue }) => {
    const currentTime = new Date().getTime();
    const cacheEntry = userCache[companyId];

    if (cacheEntry && (currentTime - cacheEntry.timestamp) < 60000) {
      console.log('Returning cached data');
      return cacheEntry.data;
    }

    try {
      const usersQuery = query(collection(db, 'users'), where('companyId', '==', companyId));
      const querySnapshot = await getDocs(usersQuery);
      const users = querySnapshot.docs.map(doc => doc.data() as UserType);
      userCache[companyId] = { timestamp: currentTime, data: users }; // Update cache with new data
      return users;
    } catch (error) {
      console.error('Error fetching company users:', error);
      return rejectWithValue('Failed to fetch company users');
    }
  }
);



