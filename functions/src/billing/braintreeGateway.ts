// functions/src/billing/braintreeGateway.ts
import braintree from "braintree";

let _gateway: braintree.BraintreeGateway | null = null;

/**
 * Require an environment variable to be present.
 *
 * This is used to fail fast when critical billing configuration
 * (e.g. Braintree credentials) is missing.
 *
 * ⚠️ This function intentionally throws at runtime if the variable
 * is not defined. It should only be invoked lazily (not at module load)
 * to avoid breaking Firebase deploy analysis.
 *
 * @param name - The name of the environment variable
 * @returns The resolved environment variable value
 * @throws Error if the environment variable is missing or empty
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Get (or create) the Braintree gateway.
 * Safe for Firebase deploy + runtime.
 */
export function getBraintreeGateway(): braintree.BraintreeGateway {
  if (_gateway) return _gateway;
  console.log("BRAINTREE CONFIG", {
    env: process.env.BRAINTREE_ENVIRONMENT,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    keyPrefix: process.env.BRAINTREE_PUBLIC_KEY?.slice(0, 6),
  });

  const environment =
    requireEnv("BRAINTREE_ENVIRONMENT") === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production;

  _gateway = new braintree.BraintreeGateway({
    environment,
    merchantId: requireEnv("BRAINTREE_MERCHANT_ID"),
    publicKey: requireEnv("BRAINTREE_PUBLIC_KEY"),
    privateKey: requireEnv("BRAINTREE_PRIVATE_KEY"),
  });

  return _gateway;
}

/** Diagnostics only */
export function getBraintreeMode() {
  return requireEnv("BRAINTREE_ENVIRONMENT");
}
