import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const COMMENT_SCAN_LIMIT = 10000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_WINDOWS = new Set([30, 90, 365]);

type UserEngagement = {
  commentsAuthored: number;
  repliesAuthored: number;
  commentLikesGiven: number;
  lastCommentAt: number | null;
  lastReplyAt: number | null;
};

type CachedAnalytics = {
  expiresAt: number;
  data: Record<string, unknown>;
};

const analyticsCache = new Map<number, CachedAnalytics>();

const emptyEngagement = (): UserEngagement => ({
  commentsAuthored: 0,
  repliesAuthored: 0,
  commentLikesGiven: 0,
  lastCommentAt: null,
  lastReplyAt: null,
});

const toMillis = (value: unknown): number | null => {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
};

/**
 * Developer-only adoption report for recent comment activity.
 *
 * Likes are the current likes attached to comments created inside the selected
 * window. Legacy comment documents do not record a separate like timestamp,
 * so this intentionally measures current adoption rather than like chronology.
 */
export const getCommentEngagementAnalytics = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required");
    }

    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    const callerRole = callerSnap.data()?.role;

    if (!["developer", "super-admin"].includes(callerRole)) {
      throw new HttpsError("permission-denied", "Not allowed");
    }

    const requestedDays = Number(request.data?.days ?? 90);
    const days = ALLOWED_WINDOWS.has(requestedDays) ? requestedDays : 90;
    const forceRefresh = request.data?.force === true;
    const cached = analyticsCache.get(days);

    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const since = admin.firestore.Timestamp.fromMillis(sinceMs);

    const [commentsSnap, usersSnap] = await Promise.all([
      db
        .collection("comments")
        .where("timestamp", ">=", since)
        .orderBy("timestamp", "desc")
        .limit(COMMENT_SCAN_LIMIT)
        .select(
          "userId",
          "timestamp",
          "parentCommentId",
          "rootCommentId",
          "likes"
        )
        .get(),
      db
        .collection("users")
        .select(
          "firstName",
          "lastName",
          "email",
          "company",
          "companyName",
          "companyId",
          "role",
          "status"
        )
        .get(),
    ]);

    const engagementByUser = new Map<string, UserEngagement>();
    const getEngagement = (uid: string) => {
      const existing = engagementByUser.get(uid);
      if (existing) return existing;

      const created = emptyEngagement();
      engagementByUser.set(uid, created);
      return created;
    };

    commentsSnap.docs.forEach((commentSnap) => {
      const comment = commentSnap.data();
      const authorUid =
        typeof comment.userId === "string" ? comment.userId.trim() : "";
      const isReply = Boolean(comment.parentCommentId || comment.rootCommentId);
      const timestampMs = toMillis(comment.timestamp);

      if (authorUid) {
        const author = getEngagement(authorUid);

        if (isReply) {
          author.repliesAuthored += 1;
          author.lastReplyAt = Math.max(
            author.lastReplyAt ?? 0,
            timestampMs ?? 0
          );
        } else {
          author.commentsAuthored += 1;
          author.lastCommentAt = Math.max(
            author.lastCommentAt ?? 0,
            timestampMs ?? 0
          );
        }
      }

      const uniqueLikes = new Set(
        Array.isArray(comment.likes)
          ? comment.likes.filter(
              (uid: unknown): uid is string =>
                typeof uid === "string" && uid.trim().length > 0
            )
          : []
      );

      uniqueLikes.forEach((uid) => {
        getEngagement(uid).commentLikesGiven += 1;
      });
    });

    const users = usersSnap.docs
      .map((userSnap) => {
        const user = userSnap.data();
        const role = String(user.role ?? "");
        const status = String(user.status ?? "");

        if (
          role === "developer" ||
          role === "status-pending" ||
          ["deleted", "inactive", "pending"].includes(status)
        ) {
          return null;
        }

        const engagement =
          engagementByUser.get(userSnap.id) ?? emptyEngagement();
        const totalActions =
          engagement.commentsAuthored +
          engagement.repliesAuthored +
          engagement.commentLikesGiven;
        const lastActivityAt = Math.max(
          engagement.lastCommentAt ?? 0,
          engagement.lastReplyAt ?? 0
        );

        return {
          uid: userSnap.id,
          firstName: String(user.firstName ?? ""),
          lastName: String(user.lastName ?? ""),
          email: String(user.email ?? ""),
          companyId: String(user.companyId ?? ""),
          companyName: String(user.companyName ?? user.company ?? ""),
          role,
          commentsAuthored: engagement.commentsAuthored,
          repliesAuthored: engagement.repliesAuthored,
          commentLikesGiven: engagement.commentLikesGiven,
          totalActions,
          lastActivityAt: lastActivityAt || null,
          engaged: totalActions > 0,
        };
      })
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .sort((a, b) => {
        const companyCompare = a.companyName.localeCompare(b.companyName);
        if (companyCompare !== 0) return companyCompare;

        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      });

    const summary = {
      totalUsers: users.length,
      engagedUsers: users.filter((user) => user.engaged).length,
      commenters: users.filter((user) => user.commentsAuthored > 0).length,
      commentLikers: users.filter((user) => user.commentLikesGiven > 0).length,
      repliers: users.filter((user) => user.repliesAuthored > 0).length,
      needsOutreach: users.filter((user) => !user.engaged).length,
    };

    const data = {
      days,
      since: since.toDate().toISOString(),
      generatedAt: new Date().toISOString(),
      scannedComments: commentsSnap.size,
      truncated: commentsSnap.size === COMMENT_SCAN_LIMIT,
      summary,
      users,
    };

    analyticsCache.set(days, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data,
    });

    return data;
  }
);
