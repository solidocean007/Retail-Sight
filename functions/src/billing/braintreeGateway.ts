// functions/src/billing/braintreeGateway.ts
import braintree from "braintree";
import {
  BRAINTREE_ENVIRONMENT,
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_PUBLIC_KEY,
  BRAINTREE_PRIVATE_KEY,
} from "./braintreeSecrets";

/**
 * Get (or create) the Braintree gateway.
 * Uses Firebase Secret Manager values.
 */
export function getBraintreeGateway(): braintree.BraintreeGateway {
  const envRaw = BRAINTREE_ENVIRONMENT.value();
  const env = envRaw?.toLowerCase().trim();

  console.log("ENV RAW:", envRaw);
  console.log("ENV NORMALIZED:", env);
  console.log("MERCHANT:", BRAINTREE_MERCHANT_ID.value());
  console.log("MERCHANT LENGTH:", BRAINTREE_MERCHANT_ID.value()?.length);
  console.log("PUBLIC:", BRAINTREE_PUBLIC_KEY.value());
  console.log("PUBLIC LENGTH:", BRAINTREE_PUBLIC_KEY.value()?.length);
  console.log("PRIVATE LENGTH:", BRAINTREE_PRIVATE_KEY.value()?.length);

  const environment =
    env === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production;

  console.log("ENV OBJECT:", environment);

  return new braintree.BraintreeGateway({
    environment,
    merchantId: BRAINTREE_MERCHANT_ID.value(),
    publicKey: BRAINTREE_PUBLIC_KEY.value(),
    privateKey: BRAINTREE_PRIVATE_KEY.value(),
  });
}

/** Diagnostics only */
export function getBraintreeMode() {
  return BRAINTREE_ENVIRONMENT.value();
}
