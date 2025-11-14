import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const generatePostShareToken = onCall(
  { region: "us-central1" },
  async (request) => {
    const { postId, expiresInHours = 48 } = request.data || {};
    const auth = request.auth;

    if (!auth || !auth.uid) {
      throw new Error("Must be authenticated to generate a link.");
    }

    if (!postId) {
      throw new Error("Missing postId.");
    }

    // 1. Create token
    const token = uuidv4().replace(/-/g, "").slice(0, 16);

    const expiresAt =
      expiresInHours > 0
        ? admin.firestore.Timestamp.fromMillis(
            Date.now() + expiresInHours * 60 * 60 * 1000
          )
        : null;

    // 2. Write token doc
    await db.collection("shareTokens").doc(token).set({
      postId,
      createdBy: auth.uid,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt,
      revoked: false,
      accessLevel: "view",
    });

    // 3. Build link
    const shareUrl = `https://displaygram.com/view-shared-post/${postId}/${token}`;

    const shortLink = await createDynamicLink(shareUrl);

    return { token, shareUrl: shortLink, expiresAt };
  }
);

async function createDynamicLink(longUrl: string): Promise<string> {
  const resp = await fetch(
    "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=" + process.env.DYNAMIC_LINKS_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dynamicLinkInfo: {
          domainUriPrefix: "https://displaygram.page.link",
          link: longUrl,
        }
      })
    }
  );

  const data = await resp.json();
  return data.shortLink;
}
