// readData.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const readData = functions.https.onRequest(
  async (req, res): Promise<void> => {
    const apiKey = req.query.apiKey as string;
    const collection = req.query.collection as string;

    if (!apiKey || !collection) {
      res.status(400).send("API key and collection name are required.");
      return;
    }

    try {
      // Validate API Key
      const apiKeyDoc = await admin
        .firestore()
        .collection("apiKeys")
        .where("apiKey", "==", apiKey)
        .get();
      if (apiKeyDoc.empty) {
        res.status(403).send("API key not found.");
        return;
      }

      const apiKeyData = apiKeyDoc.docs[0].data();
      const permissions = apiKeyData.permissions;

      if (!permissions[collection] || !permissions[collection].canRead) {
        res.status(403).send("Read permission denied.");
        return;
      }

      // Proceed with reading data
      const snapshot = await admin.firestore().collection(collection).get();
      const data = snapshot.docs.map((doc) => doc.data());

      res.status(200).send(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send((error as Error).message);
    }
  }
);
