import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const COMMENT_SCAN_LIMIT = 10000;
const DETAIL_LIMIT = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALLOWED_WINDOWS = new Set([30, 90, 365]);
const DETAIL_KINDS = new Set(["comment", "like", "reply"]);

type EngagementDetailKind = "comment" | "like" | "reply";

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

const toStringValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

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

/**
 * Developer-only drill-down for one user's recent comment engagement.
 *
 * Like records are current-state only. They identify the comment that is
 * currently liked, but legacy comment documents do not contain a like time.
 */
export const getUserCommentEngagementDetails = onCall(
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

    const targetUid = toStringValue(request.data?.uid);
    if (!targetUid || targetUid.length > 128) {
      throw new HttpsError("invalid-argument", "A valid user id is required");
    }

    const requestedDays = Number(request.data?.days ?? 90);
    const days = ALLOWED_WINDOWS.has(requestedDays) ? requestedDays : 90;
    const requestedKind = toStringValue(request.data?.kind);
    const kind: EngagementDetailKind = DETAIL_KINDS.has(requestedKind)
      ? (requestedKind as EngagementDetailKind)
      : "comment";
    const since = admin.firestore.Timestamp.fromMillis(
      Date.now() - days * 24 * 60 * 60 * 1000
    );

    const commentsSnap = await db
      .collection("comments")
      .where("timestamp", ">=", since)
      .orderBy("timestamp", "desc")
      .limit(COMMENT_SCAN_LIMIT)
      .select(
        "userId",
        "userName",
        "text",
        "postId",
        "timestamp",
        "parentCommentId",
        "rootCommentId",
        "replyToUserName",
        "likes"
      )
      .get();

    const matches = commentsSnap.docs.filter((commentSnap) => {
      const comment = commentSnap.data();
      const isReply = Boolean(comment.parentCommentId || comment.rootCommentId);

      if (kind === "like") {
        return (
          Array.isArray(comment.likes) && comment.likes.includes(targetUid)
        );
      }

      const isTargetAuthor = toStringValue(comment.userId) === targetUid;
      return kind === "reply"
        ? isTargetAuthor && isReply
        : isTargetAuthor && !isReply;
    });

    const selectedComments = matches.slice(0, DETAIL_LIMIT);
    const postIds = Array.from(
      new Set(
        selectedComments
          .map((commentSnap) => toStringValue(commentSnap.data().postId))
          .filter(Boolean)
      )
    );
    const postSnaps = await Promise.all(
      postIds.map((postId) => db.doc(`posts/${postId}`).get())
    );
    const postsById = new Map(
      postSnaps.map((postSnap) => [postSnap.id, postSnap.data()])
    );

    const details = selectedComments.map((commentSnap) => {
      const comment = commentSnap.data();
      const postId = toStringValue(comment.postId);
      const post = postsById.get(postId);
      const postAccount = post?.account as Record<string, unknown> | undefined;
      const commentCreatedAt = toMillis(comment.timestamp);
      const accountName =
        toStringValue(post?.accountName) ||
        toStringValue(postAccount?.accountName);
      const accountAddress =
        toStringValue(post?.accountAddress) ||
        toStringValue(post?.streetAddress) ||
        toStringValue(postAccount?.accountAddress) ||
        toStringValue(postAccount?.streetAddress);
      const postAuthorName =
        toStringValue(post?.postUserFullName) ||
        [post?.postUserFirstName, post?.postUserLastName]
          .map(toStringValue)
          .filter(Boolean)
          .join(" ");

      return {
        kind,
        commentId: commentSnap.id,
        postId,
        text: toStringValue(comment.text),
        commentAuthorName: toStringValue(comment.userName),
        replyToUserName: toStringValue(comment.replyToUserName),
        commentCreatedAt,
        activityAt: kind === "like" ? null : commentCreatedAt,
        accountName,
        accountAddress,
        postDescription: toStringValue(post?.description),
        postAuthorName,
        postAvailable: Boolean(post),
      };
    });

    return {
      uid: targetUid,
      kind,
      days,
      scannedComments: commentsSnap.size,
      totalMatched: matches.length,
      truncated:
        matches.length > selectedComments.length ||
        commentsSnap.size === COMMENT_SCAN_LIMIT,
      details,
    };
  }
);
