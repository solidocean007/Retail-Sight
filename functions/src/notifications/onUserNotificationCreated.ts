import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

export const onUserNotificationCreated = onDocumentCreated(
  "/users/{uid}/notifications/{notificationId}",
  async (event) => {
    const uid = event.params.uid as string;
    const notificationId = event.params.notificationId as string;
    const notification = event.data?.data() as any;

    const logCtx = { uid, notificationId };

    logger.info("🔔 onUserNotificationCreated fired", {
      ...logCtx,
      hasEventData: !!event.data,
      eventId: event.id,
      createdAt: event.time,
    });

    if (!notification) {
      logger.warn(
        "❌ Missing notification data (event.data?.data() is null)",
        logCtx
      );
      return;
    }

    // Log key fields (safe)
    logger.info("📦 Notification payload summary", {
      ...logCtx,
      type: notification.type ?? null,
      priority: notification.priority ?? null,
      hasTitle: !!notification.title,
      hasMessage: !!notification.message,
      hasPostId: !!notification.postId,
      hasGoalId: !!notification.goalId,
      deliveredVia: notification.deliveredVia ?? null,
      createdAt: notification.createdAt ?? null,
    });

    // ------------------------------------------
    // Idempotency guard
    // ------------------------------------------
    if (notification.deliveredVia?.push) {
      logger.info(
        "⏭️ Push already delivered (deliveredVia.push exists). Skipping.",
        logCtx
      );
      return;
    }

    // ------------------------------------------
    // Push eligibility (your rule)
    // ------------------------------------------
    const intent = notification.intent ?? "activity";
    const shouldSendPush = intent !== "silent";

    logger.info("🧮 Push eligibility computed", {
      ...logCtx,
      intent,
      shouldSendPush,
      rule: "intent !== 'silent'",
    });

    if (!shouldSendPush) {
      logger.info("⏭️ Not eligible for push. Skipping.", logCtx);
      return;
    }

    // ------------------------------------------
    // Fetch FCM tokens
    // ------------------------------------------
    let tokenSnap;
    try {
      tokenSnap = await db
        .collection("users")
        .doc(uid)
        .collection("fcmTokens")
        .get();
    } catch (err: any) {
      logger.error("🔥 Failed to read fcmTokens subcollection", {
        ...logCtx,
        error: err?.message ?? String(err),
        code: err?.code ?? null,
      });
      return;
    }

    logger.info("📲 FCM tokens fetched", {
      ...logCtx,
      tokenCount: tokenSnap.size,
      tokenDocIdsSample: tokenSnap.docs
        .slice(0, 2)
        .map((d) => d.id.slice(0, 10) + "…"),
    });

    if (tokenSnap.empty) {
      logger.warn("⚠️ No tokens for user; cannot send push", logCtx);
      return;
    }

    const tokens = tokenSnap.docs.map((d) => d.id);

    // ------------------------------------------
    // Build message
    // ------------------------------------------
    const title = notification.title || "New Notification";
    const body = notification.message || "";
    const link = "/notifications";

    const msg = {
      tokens,
      // NOTE: data-only payload. SW MUST call showNotification().
      data: {
        title,
        body,
        notificationId,
        type: notification.type || "generic",
        postId: notification.postId || "",
        goalId: notification.goalId || "",
        link,
      },
      // Optional: helps Android devices consistently play sound when SW shows it.
      android: {
        priority: "high" as const,
      },
    };

    logger.info("🧾 Sending multicast push (data-only)", {
      ...logCtx,
      tokenCount: tokens.length,
      dataKeys: Object.keys(msg.data),
      titlePreview: String(title).slice(0, 60),
      bodyPreview: String(body).slice(0, 80),
    });

    // ------------------------------------------
    // Send
    // ------------------------------------------
    const messaging = getMessaging();

    let res;
    try {
      res = await messaging.sendEachForMulticast(msg);
    } catch (err: any) {
      logger.error("🔥 messaging.sendEachForMulticast threw", {
        ...logCtx,
        error: err?.message ?? String(err),
        code: err?.code ?? null,
      });
      return;
    }

    logger.info("✅ Multicast send completed", {
      ...logCtx,
      successCount: res.successCount,
      failureCount: res.failureCount,
    });

    // ------------------------------------------
    // Log failures (high signal)
    // ------------------------------------------
    const failures = res.responses
      .map((r, idx) => {
        if (r.success) return null;
        return {
          idx,
          tokenPrefix: tokens[idx]?.slice(0, 10) + "…",
          code: r.error?.code ?? null,
          message: r.error?.message ?? null,
        };
      })
      .filter(Boolean);

    if (failures.length) {
      logger.warn("⚠️ Some tokens failed", {
        ...logCtx,
        failuresCount: failures.length,
        failures: failures.slice(0, 10), // don’t spam logs if many
      });
    }

    // ------------------------------------------
    // Cleanup invalid tokens + mark delivered
    // ------------------------------------------
    const batch = db.batch();

    let invalidTokenDeletes = 0;

    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code;
        if (code === "messaging/registration-token-not-registered") {
          invalidTokenDeletes++;
          const badToken = tokens[idx];
          batch.delete(
            db
              .collection("users")
              .doc(uid)
              .collection("fcmTokens")
              .doc(badToken)
          );
        }
      }
    });

    const notifRef = db.doc(`users/${uid}/notifications/${notificationId}`);
    batch.update(notifRef, {
      "deliveredVia.push": FieldValue.serverTimestamp(),
      "deliveredVia.pushAttemptedAt": FieldValue.serverTimestamp(),
      "deliveredVia.pushResult": {
        successCount: res.successCount,
        failureCount: res.failureCount,
        invalidTokenDeletes,
      },
    });

    try {
      await batch.commit();
      logger.info("🧹 Cleanup + delivery markers committed", {
        ...logCtx,
        invalidTokenDeletes,
      });
    } catch (err: any) {
      logger.error("🔥 Failed to commit cleanup/delivery markers batch", {
        ...logCtx,
        error: err?.message ?? String(err),
        code: err?.code ?? null,
      });
      // Note: push already attempted; we don’t rethrow
      return;
    }

    logger.info("🎉 Push pipeline finished", {
      ...logCtx,
      successCount: res.successCount,
      failureCount: res.failureCount,
      invalidTokenDeletes,
    });
  }
);
