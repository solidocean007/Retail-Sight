import { onCall, HttpsError } from "firebase-functions/v2/https";

export const getMyAuthClaims = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError("unauthenticated", "Not logged in");
  }

  const { uid, token } = req.auth;

  return {
    uid,
    claims: token ?? {},
    role: token?.role ?? null,
    isAdmin:
      token?.role === "admin" ||
      token?.role === "owner" ||
      token?.role === "developer" ||
      token?.role === "super-admin",
  };
});
