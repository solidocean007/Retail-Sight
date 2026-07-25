import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Trigger: When a new post is created
 * Path: posts/{postId}
 * Goal: If postUser has a supervisor AND the supervisor enabled notifications,
 *       send a notification to that supervisor.
 */
export const supervisorDisplayAlert = onDocumentCreated(
  "posts/{postId}",
  async (event) => {
    const post = event.data?.data() as any;
    if (!post) return;

    const postUserId: string | undefined =
      post.postUser?.uid || post.postUserUid || post.userId;

    if (!postUserId) return;

    // Fetch post user's profile
    const userSnap = await db.doc(`users/${postUserId}`).get();
    if (!userSnap.exists) return;

    const postUser = userSnap.data() as any;

    // Skip if not an employee
    if (postUser.role !== "employee") return;

    // Must have a supervisor assigned
    const supervisorUid: string | undefined = postUser.reportsTo;
    if (!supervisorUid) return;

    // Fetch supervisor profile
    const supervisorSnap = await db.doc(`users/${supervisorUid}`).get();
    if (!supervisorSnap.exists) return;

    const supervisor = supervisorSnap.data() as any;

    // Double-check supervisor role
    if (supervisor.role !== "supervisor") return;

    // Fetch supervisor's notification settings
    const settingsRef = db.doc(
      `users/${supervisorUid}/notificationSettings/settings`
    );

    const settingsSnap = await settingsRef.get();
    const settings = settingsSnap.exists ? settingsSnap.data() : null;

    // Supervisor must have this toggle turned ON
    if (!settings?.supervisorDisplayAlerts) return;

    // Build display context: store name + truncated brand list
    const brands: string[] = (post.brands || []).filter(Boolean);
    const brandsLabel = brands.length
      ? brands.slice(0, 2).join(", ") +
        (brands.length > 2 ? ` +${brands.length - 2} more` : "")
      : "";

    const contextParts = [post.accountName, brandsLabel].filter(Boolean);
    const context = contextParts.length ? ` — ${contextParts.join(" · ")}` : "";

    // Build the notification entry
    const notifRef = db
      .collection(`users/${supervisorUid}/notifications`)
      .doc();

    await notifRef.set({
      id: notifRef.id,
      type: "supervisor-display-alert",
      title: "New Display From Your Team",
      message: `${postUser.firstName} ${postUser.lastName} created a new display${context}.`,
      postId: event.params.postId,
      companyId: supervisor.companyId,
      sentBy: {
        uid: postUserId,
        firstName: postUser.firstName,
        lastName: postUser.lastName,
        role: postUser.role,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      readBy: [],
    });

    // Your onUserNotificationCreated trigger will handle the push delivery
  }
);
