// functions/src/billing/braintreeGateway.ts
import braintree from "braintree";

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
  const env = requireEnv("BRAINTREE_ENVIRONMENT");

  const environment =
    env === "sandbox"
      ? braintree.Environment.Sandbox
      : braintree.Environment.Production;

  return new braintree.BraintreeGateway({
    environment,
    merchantId: requireEnv("BRAINTREE_MERCHANT_ID"),
    publicKey: requireEnv("BRAINTREE_PUBLIC_KEY"),
    privateKey: requireEnv("BRAINTREE_PRIVATE_KEY"),
  });
}

/** Diagnostics only */
export function getBraintreeMode() {
  return requireEnv("BRAINTREE_ENVIRONMENT");
}
