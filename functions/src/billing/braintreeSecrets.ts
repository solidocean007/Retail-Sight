import { defineSecret } from "firebase-functions/params";

export const BRAINTREE_ENVIRONMENT = defineSecret("BRAINTREE_ENVIRONMENT");
export const BRAINTREE_MERCHANT_ID = defineSecret("BRAINTREE_MERCHANT_ID");
export const BRAINTREE_PUBLIC_KEY = defineSecret("BRAINTREE_PUBLIC_KEY");
export const BRAINTREE_PRIVATE_KEY = defineSecret("BRAINTREE_PRIVATE_KEY");

// ✅ DO NOT export an array for onCall()
// Secrets must be inlined per-function
export const BRAINTREE_SECRET_PARAMS = {
  BRAINTREE_ENVIRONMENT,
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_PUBLIC_KEY,
  BRAINTREE_PRIVATE_KEY,
};
