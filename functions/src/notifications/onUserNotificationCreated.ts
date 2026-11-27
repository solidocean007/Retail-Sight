import { onDocumentCreated } from "firebase-functions/v2/firestore";
import {
  getMessaging,
  type MulticastMessage,
  type SendResponse,
} from "firebase-admin/messaging";
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

    const tokenEntries = tokenSnap.docs.map((tokenDoc) => ({
      token: tokenDoc.id,
      platform: tokenDoc.data().platform || "web",
    }));
    const nativeTokenEntries = tokenEntries.filter(
      ({ platform }) => platform === "android-native"
    );
    const webTokenEntries = tokenEntries.filter(
      ({ platform }) => platform !== "android-native"
    );

    // ------------------------------------------
    // Build message
    // ------------------------------------------
    const title = notification.title || "New Notification";
    const body = notification.message || "";
    const link = "/notifications";

    const data = {
      title,
      body,
      notificationId,
      type: notification.type || "generic",
      postId: notification.postId || "",
      goalId: notification.goalId || "",
      link,
    };

    const webMessage: Omit<MulticastMessage, "tokens"> = {
      // Browser tokens remain data-only so the service worker controls display.
      data,
      android: {
        priority: "high" as const,
      },
      // Web push delivery hints. NOTE: android.priority does NOT apply to
      // web push — Urgency is what keeps Chrome/Android from deferring
      // delivery of data-only messages while the device is dozing.
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400", // give up after 24h instead of queueing stale pushes
        },
      },
    };

    const nativeMessage: Omit<MulticastMessage, "tokens"> = {
      // Native Android needs a notification payload so the operating system can
      // display it while the app is backgrounded or not running.
      notification: { title, body },
      data,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "displaygram_activity",
          sound: "default",
        },
      },
    };

    logger.info("🧾 Sending platform-aware multicast push", {
      ...logCtx,
      tokenCount: tokenEntries.length,
      webTokenCount: webTokenEntries.length,
      nativeAndroidTokenCount: nativeTokenEntries.length,
      dataKeys: Object.keys(data),
      titlePreview: String(title).slice(0, 60),
      bodyPreview: String(body).slice(0, 80),
    });

    // ------------------------------------------
    // Send
    // ------------------------------------------
    const messaging = getMessaging();
    const deliveryResults: Array<{
      token: string;
      platform: string;
      response: SendResponse;
    }> = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      const sendGroup = async (
        entries: typeof tokenEntries,
        message: Omit<MulticastMessage, "tokens">
      ) => {
        if (entries.length === 0) return;

        const response = await messaging.sendEachForMulticast({
          ...message,
          tokens: entries.map(({ token }) => token),
        });

        successCount += response.successCount;
        failureCount += response.failureCount;
        response.responses.forEach((item, index) => {
          deliveryResults.push({
            ...entries[index],
            response: item,
          });
        });
      };

      await sendGroup(webTokenEntries, webMessage);
      await sendGroup(nativeTokenEntries, nativeMessage);
    } catch (err: any) {
      logger.error("🔥 Platform-aware multicast push threw", {
        ...logCtx,
        error: err?.message ?? String(err),
        code: err?.code ?? null,
      });
      return;
    }

    logger.info("✅ Multicast send completed", {
      ...logCtx,
      successCount,
      failureCount,
    });

    // ------------------------------------------
    // Log failures (high signal)
    // ------------------------------------------
    const failures = deliveryResults
      .map(({ token, platform, response }, idx) => {
        if (response.success) return null;
        return {
          idx,
          platform,
          tokenPrefix: token.slice(0, 10) + "…",
          code: response.error?.code ?? null,
          message: response.error?.message ?? null,
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

    deliveryResults.forEach(({ token, response }) => {
      if (!response.success) {
        const code = response.error?.code;
        if (code === "messaging/registration-token-not-registered") {
          invalidTokenDeletes++;
          batch.delete(
            db.collection("users").doc(uid).collection("fcmTokens").doc(token)
          );
        }
      }
    });

    const notifRef = db.doc(`users/${uid}/notifications/${notificationId}`);
    batch.update(notifRef, {
      "deliveredVia.push": FieldValue.serverTimestamp(),
      "deliveredVia.pushAttemptedAt": FieldValue.serverTimestamp(),
      "deliveredVia.pushResult": {
        successCount,
        failureCount,
        invalidTokenDeletes,
        webTokenCount: webTokenEntries.length,
        nativeAndroidTokenCount: nativeTokenEntries.length,
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
      successCount,
      failureCount,
      invalidTokenDeletes,
    });
  }
);
