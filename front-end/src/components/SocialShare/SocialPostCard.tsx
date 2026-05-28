import React from "react";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import IosShareIcon from "@mui/icons-material/IosShare";
import { PostWithID } from "../../utils/types";
import displaygramLogo from "../../assets/displaygram-logo-glow.png";
import "./socialPostCard.css";

interface Props {
  post: PostWithID;
}

const SocialPostCard: React.FC<Props> = ({ post }) => {
  const brands = post.brands ?? [];
  const publicUrl = `https://displaygram.com/p/${post.id}`;

  const accountName =
    post.accountName || post.account?.accountName || "Retail Display";

  const accountAddress =
    post.accountAddress || post.account?.accountAddress || "";

  const userName =
    [post.postUserFirstName, post.postUserLastName].filter(Boolean).join(" ") ||
    `${post.postUser?.firstName ?? ""} ${post.postUser?.lastName ?? ""}`.trim() ||
    "Displaygram User";

  const companyName =
    post.postUserCompanyName || post.postUser?.company || "Displaygram";

  const goalTitle = post.galloGoal?.title || post.companyGoalTitle;

  return (
    <div className="social-post-card">
      <header className="social-card-brand-header social-texture">
        <div className="social-brand-left">
          <img
            src={displaygramLogo}
            alt="Displaygram"
            className="social-displaygram-logo"
          />
        </div>
      </header>

      <main className="social-card-body">
        <section className="social-card-post-meta">
          <div>
            <h2>{accountName}</h2>
            {accountAddress && <p>{accountAddress}</p>}
          </div>

          <div className="social-card-date">
            {post.displayDate
              ? new Date(post.displayDate).toLocaleDateString()
              : ""}
          </div>
        </section>

        {goalTitle && (
          <div
            className={
              post.galloGoal ? "social-gallo-banner" : "social-goal-banner"
            }
          >
            {post.galloGoal ? "Goal execution: " : "Company goal: "}
            {goalTitle}
          </div>
        )}

        <section className="social-card-user-row">
          <strong>{userName}</strong>
          <span>{companyName}</span>
        </section>

        <section className="social-card-image-wrap">
          <img src={post.imageUrl} alt="Retail display execution" />
        </section>

        <section className="social-card-details two-card-layout">
          <div>
            <strong>{post.totalCaseCount || 0}</strong>
            <span>Units</span>
          </div>

          <div>
            <strong>{brands.slice(0, 4).join(", ") || "Retail display"}</strong>
            <span>Brands tracked</span>
          </div>
        </section>

        {post.description && (
          <p className="social-card-description">{post.description}</p>
        )}

        <section className="social-card-interactions">
          <span>
            <FavoriteBorderIcon fontSize="small" /> Like
          </span>
          <span>
            <ChatBubbleOutlineIcon fontSize="small" /> Comment
          </span>
          <span>
            <IosShareIcon fontSize="small" /> Share
          </span>
        </section>
      </main>

      <footer className="social-card-footer social-texture">
        <span>View the full display on Displaygram</span>
        <small>{publicUrl}</small>
      </footer>
    </div>
  );
};

export default SocialPostCard;
