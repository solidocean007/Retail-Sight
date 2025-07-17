import * as admin from "firebase-admin";
import * as express from "express";
import * as functions from "firebase-functions";
import * as cors from "cors";

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post("/checkUserExists", async (req, res) => {
  console.log("checkUserExists request");

  // Check authentication header (optional, remove if not needed)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ error: "Authentication is required." });
    return;
  }

  // Extract email from request body
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).send({ error: "A valid email is required." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  console.log("Checking user for email:", normalizedEmail);

  try {
    const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
    console.log("User found:", userRecord.uid);

    res.status(200).send({
      exists: true,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.log("User not found for email:", normalizedEmail);
      res.status(200).send({ exists: false });
    } else {
      console.error("Error fetching user:", error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
});

// Export Express app as Cloud Function
export const checkUserExists = functions.https.onRequest(app);
