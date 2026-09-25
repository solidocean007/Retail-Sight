import { useCallback, useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../utils/firebase";
import "./commentEngagementAnalytics.css";

type RangeDays = 30 | 90 | 365;
type AdoptionFilter = "all" | "engaged" | "outreach";

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

const formatDate = (timestamp: number | null) => {
  if (!timestamp) return "No authored activity";

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

type CommentEngagementAnalyticsProps = {
  previewData?: CommentEngagementResponse;
};

const CommentEngagementAnalytics = ({
  previewData,
}: CommentEngagementAnalyticsProps) => {
  const [days, setDays] = useState<RangeDays>(90);
  const [analytics, setAnalytics] = useState<CommentEngagementResponse>(
    previewData ?? emptyAnalytics,
  );
  const [filter, setFilter] = useState<AdoptionFilter>("outreach");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                  <td>{user.commentsAuthored}</td>
                  <td>{user.commentLikesGiven}</td>
                  <td>{user.repliesAuthored}</td>
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
    </section>
  );
};

export default CommentEngagementAnalytics;
