// utils/firestoreUtils.ts
import store from './store';
import { incrementRead } from '../Slices/firestoreReadsSlice';

export const firestoreRead = async (readFunction: () => Promise<any>, logMessage?: string) => {
  store.dispatch(incrementRead(1));
  if (logMessage && process.env.NODE_ENV === 'development') {
    console.log(`Firestore read: ${logMessage}`);
  }
  try {
    const result = await readFunction();
    return result;
  } catch (error) {
    console.error('Firestore read error:', error);
    throw error;
  }
};
