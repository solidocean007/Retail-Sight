import { onCall } from "firebase-functions/v2/https";

// A minimal Gen-2 callable function to test your setup
export const ping = onCall((request) => {
  const uid = request.auth?.uid || null;

  return {
    ok: true,
    uid,
    timestamp: Date.now(),
    message: "Ping received and function is working!",
  };
});
