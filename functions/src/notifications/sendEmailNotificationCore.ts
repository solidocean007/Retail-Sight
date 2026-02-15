// sendEmailNotificationCore.ts
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/https";

const db = admin.firestore();

type SendEmailNotificationInput = {
  title: string;
  message: string;
  link?: string | null;
  notificationId: string;
  recipientUserIds: string[];
};

/**
 * sendEmailNotificationCore
 *
 * Enqueues transactional email notifications for a set of users.
 *
 * This function:
 * - Looks up each recipient's email from `/users/{uid}`
 * - Generates a trackable redirect URL (`trackEmailClick`)
 * - Writes email documents to the `mail` collection
 * - Stores metadata for analytics and debugging
 *
 * IMPORTANT:
 * - This does NOT send email directly.
 * - A Firestore email extension or mail processor must be installed.
 * - Tracking works by redirecting through `trackEmailClick`.
 *
 * @param input - Email payload configuration
 * @param input.title - Email subject line
 * @param input.message - Email body content (plain text rendered as HTML)
 * @param input.link - Optional destination URL (redirected via tracking endpoint)
 * @param input.notificationId - Base notification ID used for tracking correlation
 * @param input.recipientUserIds - Array of user IDs to receive the email
 *
 * @returns Promise<void>
 *
 * @throws Does not throw on missing user email; silently skips users without email.
 */
export async function sendEmailNotificationCore(
  input: SendEmailNotificationInput
) {
  const { title, message, link, notificationId, recipientUserIds } = input;

  const writes: Promise<any>[] = [];

  for (const uid of recipientUserIds) {
    const userSnap = await db.doc(`users/${uid}`).get();
    const user = userSnap.data();
    if (!user?.email) continue;

    // Trackable redirect link
    const trackingUrl =
      "https://us-central1-retail-sight.cloudfunctions.net/trackEmailClick" +
      "?notificationId=" +
      encodeURIComponent(notificationId) +
      "&uid=" +
      encodeURIComponent(uid);

    const html = `
      <h2>${title}</h2>
      <p>${message}</p>
      ${
        link
          ? `<p><a href="${trackingUrl}" target="_blank">View Message</a></p>`
          : ""
      }
    `;

    writes.push(
      db.collection("mail").add({
        to: user.email,
        message: {
          subject: title,
          html,
        },
        metadata: {
          notificationId,
          uid,
          originalLink: link ?? null,
        },
      })
    );
  }

  for (const write of writes) {
    await write;
    await new Promise((r) => setTimeout(r, 300)); // 300ms delay
  }
}

/**
 * trackEmailClick
 *
 * HTTPS tracking endpoint for email notification engagement.
 *
 * Workflow:
 * 1. Validates `notificationId` and `uid` query params
 * 2. Locates `/users/{uid}/notifications/{notificationId}`
 * 3. Writes:
 *      analytics.emailClickedAt
 *      analytics.clickedFrom = "email"
 * 4. Redirects to the original notification `link`
 *
 * Fallback behavior:
 * - If parameters are invalid
 * - If notification does not exist
 * - If any error occurs
 *   → Redirects to default notifications page
 *
 * SECURITY NOTE:
 * This endpoint assumes notificationId is deterministic
 * and not guessable. For stricter protection, consider
 * signing URLs or validating against metadata.
 *
 * Query Params:
 * - notificationId (string)
 * - uid (string)
 *
 * Response:
 * - HTTP 302 redirect to original link or fallback URL
 */
export const trackEmailClick = onRequest(async (req, res) => {
  try {
    const { notificationId, uid } = req.query;

    if (!notificationId || !uid) {
      return res.redirect("https://displaygram.com/notifications");
    }

    const perUserId = `${notificationId}_${uid}`;

    const notifRef = admin
      .firestore()
      .doc(`users/${uid}/notifications/${perUserId}`);

    const notifSnap = await notifRef.get();
    if (!notifSnap.exists) {
      return res.redirect("https://displaygram.com/notifications");
    }

    await notifRef.update({
      "analytics.emailClickedAt": admin.firestore.FieldValue.serverTimestamp(),
      "analytics.clickedFrom": "email",
    });

    const link = notifSnap.data()?.link;

    return res.redirect(link || "https://displaygram.com/notifications");
  } catch (err) {
    console.error("trackEmailClick error:", err);
    return res.redirect("https://displaygram.com/notifications");
  }
});
