// postsService.ts
import { query, where, Query, DocumentData } from "firebase/firestore";

// Update the filter functions to handle an array of strings
export const filterByChannels = (
  channels: string[],
  baseQuery: Query<DocumentData>
) => {
  if (channels.length === 0) {
    return baseQuery;
  }
  console.log("Channels for filtering:", channels);
  console.log("Final Query for Channels:", baseQuery);

  return query(baseQuery, where("channel", "in", channels));
};

export const filterByCategories = (
  categories: string[],
  baseQuery: Query<DocumentData>
) => {
  if (categories.length === 0) {
    return baseQuery;
  }
  return query(baseQuery, where("category", "in", categories));
};