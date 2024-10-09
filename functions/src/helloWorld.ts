import * as functions from "firebase-functions";

// Simple Hello World Function
export const helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});
