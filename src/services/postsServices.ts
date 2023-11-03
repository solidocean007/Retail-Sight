// postsService.ts
import { query, where, Query, DocumentData } from 'firebase/firestore';

export const filterByChannel = (channel: string, baseQuery: Query<DocumentData>) => {
  return query(baseQuery, where("channel", "==", channel));
};

export const filterByCategory = (category: string, baseQuery: Query<DocumentData>) => {
  return query(baseQuery, where("category", "==", category));
};

export const filterByState = (state: string, baseQuery: Query<DocumentData>) => { 
  return query(baseQuery, where("state", "==", state));
};

export const filterByCity = (city: string, baseQuery: Query<DocumentData>) => {
  return query(baseQuery, where("city", "==", city));
};