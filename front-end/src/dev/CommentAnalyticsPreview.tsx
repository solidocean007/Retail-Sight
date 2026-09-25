import { useState } from "react";
import CommentEngagementAnalytics, {
  CommentEngagementResponse,
} from "../components/Notifications/CommentEngagementAnalytics";
import "./commentAnalyticsPreview.css";

const now = Date.now();

const previewData: CommentEngagementResponse = {
  days: 90,
  since: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
  generatedAt: new Date(now).toISOString(),
  scannedComments: 184,
  truncated: false,
  summary: {
    totalUsers: 8,
    engagedUsers: 5,
    commenters: 4,
    commentLikers: 3,
    repliers: 3,
    needsOutreach: 3,
  },
  users: [
    {
      uid: "preview-1",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya@example.com",
      companyId: "company-1",
      companyName: "North Coast Distribution",
      role: "supervisor",
      commentsAuthored: 8,
      repliesAuthored: 5,
      commentLikesGiven: 12,
      totalActions: 25,
      lastActivityAt: now - 2 * 24 * 60 * 60 * 1000,
      engaged: true,
    },
    {
      uid: "preview-2",
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com",
      companyId: "company-1",
      companyName: "North Coast Distribution",
      role: "employee",
      commentsAuthored: 3,
      repliesAuthored: 1,
      commentLikesGiven: 4,
      totalActions: 8,
      lastActivityAt: now - 6 * 24 * 60 * 60 * 1000,
      engaged: true,
    },
    {
      uid: "preview-3",
      firstName: "Avery",
      lastName: "Patel",
      email: "avery@example.com",
      companyId: "company-2",
      companyName: "Summit Beverage",
      role: "admin",
      commentsAuthored: 5,
      repliesAuthored: 4,
      commentLikesGiven: 0,
      totalActions: 9,
      lastActivityAt: now - 9 * 24 * 60 * 60 * 1000,
      engaged: true,
    },
    {
      uid: "preview-4",
      firstName: "Riley",
      lastName: "Morgan",
      email: "riley@example.com",
      companyId: "company-3",
      companyName: "Pioneer Sales",
      role: "employee",
      commentsAuthored: 0,
      repliesAuthored: 0,
      commentLikesGiven: 3,
      totalActions: 3,
      lastActivityAt: null,
      engaged: true,
    },
    {
      uid: "preview-5",
      firstName: "Sam",
      lastName: "Wilson",
      email: "sam@example.com",
      companyId: "company-3",
      companyName: "Pioneer Sales",
      role: "supervisor",
      commentsAuthored: 1,
      repliesAuthored: 0,
      commentLikesGiven: 0,
      totalActions: 1,
      lastActivityAt: now - 20 * 24 * 60 * 60 * 1000,
      engaged: true,
    },
    {
      uid: "preview-6",
      firstName: "Taylor",
      lastName: "Brooks",
      email: "taylor@example.com",
      companyId: "company-2",
      companyName: "Summit Beverage",
      role: "employee",
      commentsAuthored: 0,
      repliesAuthored: 0,
      commentLikesGiven: 0,
      totalActions: 0,
      lastActivityAt: null,
      engaged: false,
    },
    {
      uid: "preview-7",
      firstName: "Chris",
      lastName: "Diaz",
      email: "chris@example.com",
      companyId: "company-1",
      companyName: "North Coast Distribution",
      role: "employee",
      commentsAuthored: 0,
      repliesAuthored: 0,
      commentLikesGiven: 0,
      totalActions: 0,
      lastActivityAt: null,
      engaged: false,
    },
    {
      uid: "preview-8",
      firstName: "Morgan",
      lastName: "Reed",
      email: "morgan@example.com",
      companyId: "company-4",
      companyName: "Harbor Wine & Spirits",
      role: "admin",
      commentsAuthored: 0,
      repliesAuthored: 0,
      commentLikesGiven: 0,
      totalActions: 0,
      lastActivityAt: null,
      engaged: false,
    },
  ],
};

const CommentAnalyticsPreview = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.body.getAttribute("data-theme") === "dark" ? "dark" : "light",
  );

  const changeTheme = (nextTheme: "light" | "dark") => {
    document.body.setAttribute("data-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <main className="comment-analytics-preview">
      <header>
        <div>
          <span>Local UI preview</span>
          <h1>Developer Messaging · Comment analytics</h1>
          <p>Mock data only. No Firebase reads or writes occur on this page.</p>
        </div>
        <div className="comment-analytics-preview-theme">
          <button
            type="button"
            className={theme === "light" ? "active" : ""}
            onClick={() => changeTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={theme === "dark" ? "active" : ""}
            onClick={() => changeTheme("dark")}
          >
            Dark
          </button>
        </div>
      </header>

      <section className="developer-messaging-card">
        <CommentEngagementAnalytics previewData={previewData} />
      </section>
    </main>
  );
};

export default CommentAnalyticsPreview;
