// readData.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const readData = functions.https.onRequest(async (req, res): Promise<void> => {
  console.log("Function execution started");

  console.log("Request query:", req.query); // Log the query parameters

  const apiKey = req.query.apiKey as string;
  const collection = req.query.collection as string;

  console.log("Extracted apiKey:", apiKey); // Log extracted apiKey
  console.log("Extracted collection:", collection); // Log extracted collection

  if (!apiKey || !collection) {
    console.log("Missing API key or collection");
    res.status(400).send("API key and collection name are required.");
    return;
  }

  try {
    console.log("Validating API key...");

    // Validate API Key
    const apiKeyDoc = await admin.firestore().collection("apiKeys").where("apiKey", "==", apiKey).get();
    console.log("API key validation result:", apiKeyDoc);

    if (apiKeyDoc.empty) {
      console.log("API key not found");
      res.status(403).send("API key not found.");
      return;
    }

    const apiKeyData = apiKeyDoc.docs[0].data();
    console.log("API key data:", apiKeyData);

    if (!apiKeyData.permissions.canRead) {
      console.log("Read permission denied");
      res.status(403).send("Read permission denied.");
      return;
    }

    // Proceed with reading data
    console.log("Fetching data from collection:", collection);
    const snapshot = await admin.firestore().collection(collection).get();
    const data = snapshot.docs.map((doc) => doc.data());

    console.log("Data fetched successfully");
    res.status(200).send(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send((error as Error).message);
  }
});


