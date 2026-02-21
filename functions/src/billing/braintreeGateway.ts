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
  const env = BRAINTREE_ENVIRONMENT.value();

  const environment =
    env === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production;

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
