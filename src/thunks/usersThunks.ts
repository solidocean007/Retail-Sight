import { createAsyncThunk } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Regular function for fetching company users
export const fetchCompanyUsersFromFirestore = async (companyId: string): Promise<UserType[]> => {
  const querySnapshot = await getDocs(query(collection(db, 'users'), where('companyId', '==', companyId)));
  return querySnapshot.docs.map(doc => doc.data() as UserType);
};


// Async thunk for fetching company users
export const fetchCompanyUsers = createAsyncThunk<UserType[], string, { rejectValue: string }>(
  'user/fetchCompanyUsers',
  async (companyId, { rejectWithValue }) => {
    try {
      const users = await fetchCompanyUsersFromFirestore(companyId);
      return users;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);


// Add more thunks as needed
