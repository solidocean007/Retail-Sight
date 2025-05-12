// postsService.ts
import { query, where, Query, DocumentData } from "firebase/firestore";

// Update the filter functions to handle an array of strings
export const filterByChannels = (
  channels: string[],
  baseQuery: Query<DocumentData>,
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
  baseQuery: Query<DocumentData>,
) => {
  if (categories.length === 0) {
    return baseQuery;
  }
  return query(baseQuery, where("category", "in", categories));
};

export const filterByStates = (
  states: string[],
  baseQuery: Query<DocumentData>,
) => {
  if (states.length === 0) {
    return baseQuery;
  }

  return query(baseQuery, where("state", "in", states));
};

export const filterByCities = (
  cities: string[],
  baseQuery: Query<DocumentData>,
) => {
  if (cities.length === 0) {
    return baseQuery;
  }

  return query(baseQuery, where("city", "in", cities));
};

export const filterByHashtag = (
  hashtag: string,
  baseQuery: Query<DocumentData>,
) => {
  if (hashtag.length === 0) {
    return baseQuery;
  }

  return query(baseQuery, where("hashtags", "array-contains", hashtag));
};

export const filterByStarTag = (
  starTag: string,
  baseQuery: Query<DocumentData>,
) => {
  if (starTag.length === 0) {
    return baseQuery;
  }

  return query(baseQuery, where("starTags", "array-contains", starTag));
};
