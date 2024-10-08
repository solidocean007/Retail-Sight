import * as functions from "firebase-functions";

// A simple HTTP function
export const testFetchData = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase!");
});
