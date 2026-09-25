import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { CircularProgress, Drawer, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useSelector } from "react-redux";
import { functions } from "../../utils/firebase";
import { selectUser } from "../../Slices/userSlice";
import PostViewerModal from "../PostViewerModal";
import "./commentEngagementAnalytics.css";

type RangeDays = 30 | 90 | 365;
type AdoptionFilter = "all" | "engaged" | "outreach";
export type EngagementDetailKind = "comment" | "like" | "reply";

type EngagementUser = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId: string;
  companyName: string;
  role: string;
  commentsAuthored: number;
  repliesAuthored: number;
  commentLikesGiven: number;
  totalActions: number;
  lastActivityAt: number | null;
  engaged: boolean;
};

export type CommentEngagementResponse = {
  days: RangeDays;
  since: string;
  generatedAt: string;
  scannedComments: number;
  truncated: boolean;
  summary: {
    totalUsers: number;
    engagedUsers: number;
    commenters: number;
    commentLikers: number;
    repliers: number;
    needsOutreach: number;
  };
  users: EngagementUser[];
};

export type CommentEngagementDetail = {
  kind: EngagementDetailKind;
  commentId: string;
  postId: string;
  text: string;
  commentAuthorName: string;
  replyToUserName: string;
  commentCreatedAt: number | null;
  activityAt: number | null;
  accountName: string;
  accountAddress: string;
  postDescription: string;
  postAuthorName: string;
  postAvailable: boolean;
  previewUserId?: string;
};

type CommentEngagementDetailsResponse = {
  uid: string;
  kind: EngagementDetailKind;
  days: RangeDays;
  scannedComments: number;
  totalMatched: number;
  truncated: boolean;
  details: CommentEngagementDetail[];
};

const EMPTY_PREVIEW_DETAILS: CommentEngagementDetail[] = [];

const emptyAnalytics: CommentEngagementResponse = {
  days: 90,
  since: "",
  generatedAt: "",
  scannedComments: 0,
  truncated: false,
  summary: {
    totalUsers: 0,
    engagedUsers: 0,
    commenters: 0,
    commentLikers: 0,
    repliers: 0,
    needsOutreach: 0,
  },
  users: [],
};

const getCommentEngagement = httpsCallable<
  { days: RangeDays; force?: boolean },
  CommentEngagementResponse
>(functions, "getCommentEngagementAnalytics");

const getUserCommentEngagementDetails = httpsCallable<
  { uid: string; days: RangeDays; kind: EngagementDetailKind },
  CommentEngagementDetailsResponse
>(functions, "getUserCommentEngagementDetails");

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "No authored activity";

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (timestamp: number | null) => {
  if (!timestamp) return "Time unavailable";

  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

type CommentEngagementAnalyticsProps = {
  previewData?: CommentEngagementResponse;
  previewDetails?: CommentEngagementDetail[];
};

const CommentEngagementAnalytics = ({
  previewData,
  previewDetails = EMPTY_PREVIEW_DETAILS,
}: CommentEngagementAnalyticsProps) => {
  const dashboardUser = useSelector(selectUser);
  const [days, setDays] = useState<RangeDays>(90);
  const [analytics, setAnalytics] = useState<CommentEngagementResponse>(
    previewData ?? emptyAnalytics,
  );
  const [filter, setFilter] = useState<AdoptionFilter>("outreach");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<EngagementUser | null>(null);
  const [detailKind, setDetailKind] = useState<EngagementDetailKind>("comment");
  const [detailItems, setDetailItems] = useState<CommentEngagementDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTruncated, setDetailTruncated] = useState(false);
  const [postViewerTarget, setPostViewerTarget] = useState<{
    postId: string;
    commentId: string;
  } | null>(null);

  const loadAnalytics = useCallback(
    async (force = false) => {
      if (previewData) {
        setAnalytics({
          ...previewData,
          days,
          since: new Date(
            Date.now() - days * 24 * 60 * 60 * 1000,
          ).toISOString(),
          generatedAt: new Date().toISOString(),
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        force ? setRefreshing(true) : setLoading(true);
        setError(null);

        const response = await getCommentEngagement({ days, force });
        setAnalytics(response.data);
      } catch (loadError) {
        console.error("Comment engagement analytics failed:", loadError);
        setError("Unable to load comment engagement analytics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, previewData],
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const loadDetails = useCallback(
    async (user: EngagementUser, kind: EngagementDetailKind) => {
      setDetailLoading(true);
      setDetailError(null);
      setDetailItems([]);
      setDetailTruncated(false);

      if (previewData) {
        setDetailItems(
          previewDetails.filter(
            (detail) =>
              detail.previewUserId === user.uid && detail.kind === kind,
          ),
        );
        setDetailLoading(false);
        return;
      }

      try {
        const response = await getUserCommentEngagementDetails({
          uid: user.uid,
          days,
          kind,
        });
        setDetailItems(response.data.details);
        setDetailTruncated(response.data.truncated);
      } catch (loadError) {
        console.error("Comment engagement details failed:", loadError);
        setDetailError("Unable to load this user's engagement details.");
      } finally {
        setDetailLoading(false);
      }
    },
    [days, previewData, previewDetails],
  );

  useEffect(() => {
    if (detailUser) void loadDetails(detailUser, detailKind);
  }, [detailKind, detailUser, loadDetails]);

  const openDetails = (
    user: EngagementUser,
    kind: EngagementDetailKind,
  ) => {
    setDetailUser(user);
    setDetailKind(kind);
  };

  const closeDetails = () => {
    setDetailUser(null);
    setDetailItems([]);
    setDetailError(null);
  };

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return analytics.users.filter((user) => {
      if (filter === "engaged" && !user.engaged) return false;
      if (filter === "outreach" && user.engaged) return false;
      if (!normalizedSearch) return true;

      return [
        user.firstName,
        user.lastName,
        user.email,
        user.companyName,
        user.role,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [analytics.users, filter, search]);

  const adoptionRate = analytics.summary.totalUsers
    ? Math.round(
        (analytics.summary.engagedUsers / analytics.summary.totalUsers) * 100,
      )
    : 0;

  const stats = [
    {
      label: "Active users",
      value: analytics.summary.engagedUsers,
      helper: `${adoptionRate}% adoption`,
    },
    {
      label: "Commented",
      value: analytics.summary.commenters,
      helper: "Started a thread",
    },
    {
      label: "Liked comments",
      value: analytics.summary.commentLikers,
      helper: "Current likes",
    },
    {
      label: "Replied",
      value: analytics.summary.repliers,
      helper: "Joined a thread",
    },
    {
      label: "Needs outreach",
      value: analytics.summary.needsOutreach,
      helper: "No activity",
      emphasis: true,
    },
  ];

  return (
    <section className="comment-engagement-analytics">
      <header className="comment-engagement-header">
        <div>
          <span className="comment-engagement-eyebrow">Adoption analytics</span>
          <h2>Comment engagement</h2>
          <p>
            See who comments, likes comments, replies, and who may benefit from
            outreach or training.
          </p>
        </div>

        <div className="comment-engagement-controls">
          <label>
            Activity window
            <select
              value={days}
              onChange={(event) =>
                setDays(Number(event.target.value) as RangeDays)
              }
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 12 months</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadAnalytics(true)}
            disabled={loading || refreshing}
          >
            {previewData ? "Preview data" : refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="comment-engagement-error">{error}</div>}

      <div className="comment-engagement-stats" aria-busy={loading}>
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={stat.emphasis ? "needs-outreach" : ""}
          >
            <span>{stat.label}</span>
            <strong>{loading ? "—" : stat.value}</strong>
            <small>{stat.helper}</small>
          </article>
        ))}
      </div>

      <div className="comment-engagement-toolbar">
        <div className="comment-engagement-filter" aria-label="User activity">
          {(
            [
              ["all", "All users"],
              ["engaged", "Engaged"],
              ["outreach", "Needs outreach"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, company, email, or role"
          aria-label="Search comment engagement users"
        />
      </div>

      <div className="comment-engagement-table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Company</th>
              <th>Comments</th>
              <th>Likes</th>
              <th>Replies</th>
              <th>Last authored activity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              visibleUsers.map((user) => (
                <tr key={user.uid}>
                  <td>
                    <strong>
                      {`${user.firstName} ${user.lastName}`.trim() ||
                        "Unnamed user"}
                    </strong>
                    <a href={`mailto:${user.email}`}>{user.email || "—"}</a>
                  </td>
                  <td>
                    <span>{user.companyName || "—"}</span>
                    <small>{user.role || "—"}</small>
                  </td>
                  <td>
                    {user.commentsAuthored > 0 ? (
                      <button
                        type="button"
                        className="comment-engagement-count-button"
                        onClick={() => openDetails(user, "comment")}
                        aria-label={`View ${user.commentsAuthored} comments from ${user.firstName} ${user.lastName}`}
                      >
                        {user.commentsAuthored}
                      </button>
                    ) : (
                      <span className="comment-engagement-zero">0</span>
                    )}
                  </td>
                  <td>
                    {user.commentLikesGiven > 0 ? (
                      <button
                        type="button"
                        className="comment-engagement-count-button"
                        onClick={() => openDetails(user, "like")}
                        aria-label={`View ${user.commentLikesGiven} current comment likes from ${user.firstName} ${user.lastName}`}
                      >
                        {user.commentLikesGiven}
                      </button>
                    ) : (
                      <span className="comment-engagement-zero">0</span>
                    )}
                  </td>
                  <td>
                    {user.repliesAuthored > 0 ? (
                      <button
                        type="button"
                        className="comment-engagement-count-button"
                        onClick={() => openDetails(user, "reply")}
                        aria-label={`View ${user.repliesAuthored} replies from ${user.firstName} ${user.lastName}`}
                      >
                        {user.repliesAuthored}
                      </button>
                    ) : (
                      <span className="comment-engagement-zero">0</span>
                    )}
                  </td>
                  <td>{formatDate(user.lastActivityAt)}</td>
                  <td>
                    <span
                      className={`comment-engagement-status ${
                        user.engaged ? "engaged" : "outreach"
                      }`}
                    >
                      {user.engaged ? "Engaged" : "Needs outreach"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {loading && (
          <div className="comment-engagement-empty">Loading analytics…</div>
        )}

        {!loading && !error && visibleUsers.length === 0 && (
          <div className="comment-engagement-empty">
            No users match this view.
          </div>
        )}
      </div>

      <footer className="comment-engagement-footnote">
        <span>
          Based on {analytics.scannedComments.toLocaleString()} comments created
          in the selected window. Likes represent current likes on those
          comments.
        </span>
        {analytics.truncated && (
          <strong>
            The report reached its 10,000-comment scan limit; narrow the
            activity window for a complete view.
          </strong>
        )}
      </footer>

      <Drawer
        anchor="right"
        open={Boolean(detailUser)}
        onClose={closeDetails}
        PaperProps={{ className: "comment-engagement-drawer" }}
      >
        {detailUser && (
          <div className="comment-engagement-drawer-content">
            <header className="comment-engagement-drawer-header">
              <div>
                <span className="comment-engagement-eyebrow">User activity</span>
                <h2>
                  {`${detailUser.firstName} ${detailUser.lastName}`.trim() ||
                    "Unnamed user"}
                </h2>
                <p>
                  {detailUser.companyName || "No company"} · Last {days} days
                </p>
              </div>
              <IconButton onClick={closeDetails} aria-label="Close activity details">
                <CloseRoundedIcon />
              </IconButton>
            </header>

            <nav
              className="comment-engagement-detail-tabs"
              aria-label="Engagement type"
            >
              {(
                [
                  ["comment", "Comments", detailUser.commentsAuthored],
                  ["like", "Likes", detailUser.commentLikesGiven],
                  ["reply", "Replies", detailUser.repliesAuthored],
                ] as const
              ).map(([kind, label, count]) => (
                <button
                  type="button"
                  key={kind}
                  className={detailKind === kind ? "active" : ""}
                  onClick={() => setDetailKind(kind)}
                  disabled={count === 0}
                  aria-pressed={detailKind === kind}
                >
                  <span>{label}</span>
                  <strong>{count}</strong>
                </button>
              ))}
            </nav>

            {detailKind === "like" && (
              <div className="comment-engagement-like-note">
                These are comments the user currently likes. The exact time of
                older likes is not available.
              </div>
            )}

            <div className="comment-engagement-detail-list" aria-busy={detailLoading}>
              {detailLoading && (
                <div className="comment-engagement-detail-loading">
                  <CircularProgress size={24} />
                  <span>Loading activity…</span>
                </div>
              )}

              {!detailLoading && detailError && (
                <div className="comment-engagement-error">{detailError}</div>
              )}

              {!detailLoading && !detailError && detailItems.length === 0 && (
                <div className="comment-engagement-detail-empty">
                  No matching activity was found in this window.
                </div>
              )}

              {!detailLoading &&
                detailItems.map((detail) => (
                  <article
                    className="comment-engagement-detail-card"
                    key={`${detail.kind}-${detail.commentId}`}
                  >
                    <div className="comment-engagement-detail-card-topline">
                      <span className={`kind-${detail.kind}`}>
                        {detail.kind === "comment"
                          ? "Comment"
                          : detail.kind === "reply"
                            ? "Reply"
                            : "Current like"}
                      </span>
                      <time>
                        {detail.kind === "like"
                          ? `Comment posted ${formatDateTime(detail.commentCreatedAt)}`
                          : formatDateTime(detail.activityAt)}
                      </time>
                    </div>

                    {detail.kind === "reply" && detail.replyToUserName && (
                      <small className="comment-engagement-reply-context">
                        Replying to {detail.replyToUserName}
                      </small>
                    )}

                    {detail.kind === "like" && detail.commentAuthorName && (
                      <small className="comment-engagement-reply-context">
                        Comment by {detail.commentAuthorName}
                      </small>
                    )}

                    <blockquote>
                      {detail.text || "Comment text is unavailable."}
                    </blockquote>

                    <div className="comment-engagement-post-context">
                      <strong>{detail.accountName || "Post context"}</strong>
                      {detail.accountAddress && <span>{detail.accountAddress}</span>}
                      {detail.postDescription && <p>{detail.postDescription}</p>}
                      {detail.postAuthorName && (
                        <small>Post by {detail.postAuthorName}</small>
                      )}
                    </div>

                    <button
                      type="button"
                      className="comment-engagement-open-post"
                      disabled={!detail.postAvailable || Boolean(previewData)}
                      onClick={() =>
                        setPostViewerTarget({
                          postId: detail.postId,
                          commentId: detail.commentId,
                        })
                      }
                    >
                      <OpenInNewRoundedIcon fontSize="small" />
                      {previewData ? "Post preview unavailable" : "Open post"}
                    </button>
                  </article>
                ))}
            </div>

            {detailTruncated && (
              <footer className="comment-engagement-detail-limit">
                Showing the 100 most recent matches. Narrow the activity window
                to review older activity.
              </footer>
            )}
          </div>
        )}
      </Drawer>

      <PostViewerModal
        postId={postViewerTarget?.postId ?? null}
        open={Boolean(postViewerTarget)}
        onClose={() => setPostViewerTarget(null)}
        currentUserUid={dashboardUser?.uid}
        initialOpenComments
        focusCommentId={postViewerTarget?.commentId ?? null}
      />
    </section>
  );
};

export default CommentEngagementAnalytics;
