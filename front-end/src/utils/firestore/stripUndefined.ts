// front-end/src/utils/firestore/stripUndefined.ts

/**
 * Firestore rejects `undefined` anywhere in a write payload
 * ("Unsupported field value: undefined"). Legacy documents that predate a
 * field commonly read back as `undefined`, so any code that copies values off
 * an existing doc can poison the next write.
 *
 * `stripUndefined` deep-clones a payload with every `undefined` removed:
 * - object keys whose value is `undefined` are dropped entirely
 * - `undefined` entries inside arrays are removed (arrays stay dense)
 * - `null` is preserved — it is a legal Firestore value and meaningful
 *   (explicitly clearing a field vs. leaving it untouched)
 *
 * With `updateDoc`, a dropped key means "leave this field as it is", which is
 * the correct semantic for values we only meant to carry forward.
 *
 * Class instances Firestore understands natively (Timestamp, GeoPoint,
 * DocumentReference, FieldValue, Date, Bytes) are passed through untouched.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const walk = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(walk);
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      out[key] = walk(val);
    }
    return out;
  }

  // Dates, Timestamps, GeoPoints, DocumentReferences, FieldValues, Bytes, etc.
  return value;
};

/** Deep-remove `undefined` from a Firestore write payload. */
export const stripUndefined = <T extends object>(obj: T): Partial<T> =>
  walk(obj) as Partial<T>;

export default stripUndefined;
