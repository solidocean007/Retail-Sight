import * as admin from "firebase-admin";
import { getBraintreeGateway } from "../braintreeGateway";
import {
  BRAINTREE_ENVIRONMENT,
  BRAINTREE_MERCHANT_ID,
  BRAINTREE_PRIVATE_KEY,
  BRAINTREE_PUBLIC_KEY,
} from "../braintreeSecrets";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const testBraintreeAuth = onCall(
  {
    secrets: [
      BRAINTREE_ENVIRONMENT,
      BRAINTREE_MERCHANT_ID,
      BRAINTREE_PUBLIC_KEY,
      BRAINTREE_PRIVATE_KEY,
    ],
  },
  async () => {
    try {
      const gateway = getBraintreeGateway();

      const result = await gateway.customer.create({
        firstName: "AuthTest",
      });

      return {
        success: result.success,
        customerId: result.customer?.id,
      };
    } catch (err: any) {
      console.error("❌ Braintree auth test failed", {
        name: err?.name,
        type: err?.type,
        message: err?.message,
        statusCode: err?.statusCode,
      });

      throw new HttpsError("internal", "Braintree authentication failed");
    }
  }
);
