// postsService.ts
import { query, where, Query, DocumentData } from "firebase/firestore";

export const filterExactMatch = (
  field: string,
  value: string | undefined,
  baseQuery: Query<DocumentData>
) => {
  if (value) {
    console.log(`Applying filter: ${field} == ${value}`);
    return query(baseQuery, where(field, "==", value));
  }
  return baseQuery;
};


export const filterInMatch = (
  field: string,
  values: string[] | undefined,
  baseQuery: Query<DocumentData>
) => {
  return values && values.length > 0
    ? query(baseQuery, where(field, "in", values))
    : baseQuery;
};

export const filterArrayContains = (
  field: string,
  value: string | undefined,
  baseQuery: Query<DocumentData>
) => {
  return value ? query(baseQuery, where(field, "array-contains", value)) : baseQuery;
};

// export const filterByChannels = (
//   channels: string[], // possibly change to a single channel.. is that better for performance and reads?
//   baseQuery: Query<DocumentData>
// ) => {
//   if (channels.length === 0) {
//     return baseQuery;
//   }
//   return query(baseQuery, where("channel", "in", channels));
// };

// export const filterByCategories = (
//   categories: string[], // same issue as above.  what should i do?
//   baseQuery: Query<DocumentData>
// ) => {
//   if (categories.length === 0) {
//     return baseQuery;
//   }
//   return query(baseQuery, where("category", "in", categories));
// };

// export const filterByStates = (
//   states: string[], // i think i might want to make this a single state
//   baseQuery: Query<DocumentData>
// ) => {
//   if (states.length === 0) {
//     return baseQuery;
//   }

//   return query(baseQuery, where("state", "in", states));
// };

// export const filterByCities = (
//   cities: string[], // again same question?  array or single city
//   baseQuery: Query<DocumentData>
// ) => {
//   if (cities.length === 0) {
//     return baseQuery;
//   }

//   return query(baseQuery, where("city", "in", cities));
// };

// export const filterByHashtag = (
//   hashtag: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   if (hashtag.length === 0) {
//     return baseQuery;
//   }

//   return query(baseQuery, where("hashtags", "array-contains", hashtag));
// };

// export const filterByStarTag = (
//   starTag: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   if (starTag.length === 0) {
//     return baseQuery;
//   }

//   return query(baseQuery, where("starTags", "array-contains", starTag));
// };

// export const filterByProductType = (
//   productType: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   return productType
//     ? query(baseQuery, where("productTypes", "array-contains", productType))
//     : baseQuery;
// };
// export const filterByCompanyGoalId = (
//   goalId: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   return goalId
//     ? query(baseQuery, where("companyGoalId", "==", goalId))
//     : baseQuery;
// };

// export const filterByCreatedByUid= (
//   createdByUid: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   return createdByUid
//     ? query(baseQuery, where("createdByUid", "==",  createdByUid))
//     : baseQuery;
// };

// export const filterByAccountName = (
//   accountName: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   return accountName
//     ? query(baseQuery, where("accountName", "==", accountName))
//     : baseQuery;
// };

// export const filterByTypeOfAccount = (
//   typeOfAccount: string,
//   baseQuery: Query<DocumentData>
// ) => {
//   return typeOfAccount
//     ? query(baseQuery, where("typeOfAccount", "==", typeOfAccount))
//     : baseQuery;
// };

// export const filterByAccountChain = (

// ) => {

// };


// export const filterByChainType= (

// ) => {

// };


// export const filterByBrand = (

// ) => {

// };



