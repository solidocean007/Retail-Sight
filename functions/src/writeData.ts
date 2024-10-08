// writeData.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const writeData = functions.https.onRequest(
  async (req, res): Promise<void> => {
    const apiKey = req.query.apiKey as string;
    const collection = req.query.collection as string;
    const data = req.body;

    if (!apiKey || !collection || !data) {
      res.status(400).send("API key, collection name, and data are required.");
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
      const companyId = apiKeyData.companyId;

      if (!permissions[collection] || !permissions[collection].canWrite) {
        res.status(403).send("Write permission denied.");
        return;
      }

      const dataWithCompanyId = {
        ...data,
        companyId: companyId,
      };

      // Proceed with writing data
      await admin.firestore().collection(collection).add(dataWithCompanyId);

      res.status(200).send("Data written successfully.");
    } catch (error) {
      console.error("Error writing data:", error);
      res.status(500).send((error as Error).message);
    }
  }
);
