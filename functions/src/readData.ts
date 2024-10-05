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
    const docId = req.query.id as string | undefined;

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
      const permissions = apiKeyData?.permissions;

      if (!permissions || !permissions[collection]?.canRead) {
        res.status(403).send("Read permission denied.");
        return;
      }

      let data;

      if (docId) {
        // Fetch a specific document if ID is provided
        const docRef = admin.firestore().collection(collection).doc(docId);
        const doc = await docRef.get();

        if (!doc.exists) {
          res.status(404).send("Document not found.");
          return;
        }

        data = { id: doc.id, ...doc.data() };
      } else {
        // Fetch the entire collection if no ID is provided
        const snapshot = await admin.firestore().collection(collection).get();
        data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }

      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).send("An error occurred while fetching data.");
    }
  }
);
