// postsService.ts
import { query, where, Query, DocumentData } from "firebase/firestore";

const normalizeString = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "");

export const filterExactMatch = (
  field: string,
  value: string | undefined,
  baseQuery: Query<DocumentData>
): Query<DocumentData> => {
  if (!value) {
    return baseQuery;
  }

  const normValue = normalizeString(value);
  const normField = `${field}Normalized`;

  return query(baseQuery, where(normField, "==", normValue));
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
  return value
    ? query(baseQuery, where(field, "array-contains", value))
    : baseQuery;
};