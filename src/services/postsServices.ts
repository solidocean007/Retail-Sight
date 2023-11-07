// postsService.ts
import { query, where, Query, DocumentData } from 'firebase/firestore';

// Update the filter functions to handle an array of strings
export const filterByChannels = (channels: string[], baseQuery: Query<DocumentData>) => {
  if (channels.length === 0) {
    return baseQuery;
  }
  return query(baseQuery, where("channel", "in", channels));
};

export const filterByCategories = (categories: string[], baseQuery: Query<DocumentData>) => {
  if (categories.length === 0) {
    return baseQuery;
  }
  return query(baseQuery, where("category", "in", categories));
};


// export const filterByState = (state: string, baseQuery: Query<DocumentData>) => { 
//   return query(baseQuery, where("state", "==", state));
// };

// export const filterByCity = (city: string, baseQuery: Query<DocumentData>) => {
//   return query(baseQuery, where("city", "==", city));
// };

