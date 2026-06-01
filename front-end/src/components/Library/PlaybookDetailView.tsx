// src/components/Playbooks/PlaybookDetailView.tsx
import React, { useMemo } from "react";
import { CollectionType, PostWithID } from "../../utils/types";
import "./playbookDetailView.css";

interface PlaybookDetailViewProps {
  playbook: CollectionType;
  posts: PostWithID[];
  onBack?: () => void;
  onExportPdf?: () => void;
  onShare?: () => void;
}

const formatAudience = (audience?: CollectionType["audience"]) => {
  if (!audience || audience === "all") return "All Team Members";
  if (audience === "sales") return "Sales Team";
  if (audience === "supervisors") return "Supervisors";
  return audience;
};

const getPostImage = (post: PostWithID) =>
  post.imageUrl || post.originalImageUrl || "";

const getDisplayTitle = (post: PostWithID) => {
  const accountName = post.accountName || post.account?.accountName;
  const brand = post.brands?.[0];

  if (brand && accountName) return `${brand} display at ${accountName}`;
  if (accountName) return `Display at ${accountName}`;
  if (brand) return `${brand} display`;

  return "Retail display example";
};

const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  playbook,
  posts,
  onBack,
  onExportPdf,
  onShare,
}) => {
  const featuredPosts = useMemo(() => {
    const featuredIds = playbook.featuredPostIds ?? [];

    if (!featuredIds.length) {
      return posts.slice(0, 3);
    }

    const featuredSet = new Set(featuredIds);
    return posts.filter((post) => featuredSet.has(post.id));
  }, [playbook.featuredPostIds, posts]);

  const supportingPosts = useMemo(() => {
    const featuredIds = new Set(featuredPosts.map((post) => post.id));
    return posts.filter((post) => !featuredIds.has(post.id));
  }, [featuredPosts, posts]);

  const primaryHeroImage = getPostImage(featuredPosts[0] ?? posts[0]);

  return (
    <article className="playbook-detail">
      <header className="playbook-detail-topbar no-print">
        <button type="button" className="btn-outline" onClick={onBack}>
          ← Back to Library
        </button>

        <div className="playbook-detail-topbar-actions">
          <button type="button" className="btn-outline" onClick={onShare}>
            Share
          </button>

          <button type="button" className="button-primary" onClick={onExportPdf}>
            Export PDF
          </button>
        </div>
      </header>

      <section className="playbook-cover">
        <div className="playbook-cover-content">
          <div className="playbook-brand-row">
            <div className="playbook-brand-mark">D</div>
            <div>
              <p className="playbook-brand-name">Displaygram</p>
              <p className="playbook-brand-subtitle">
                Retail display execution playbook
              </p>
            </div>
          </div>

          <div className="playbook-cover-copy">
            <p className="playbook-kicker">Visual Playbook</p>
            <h1>{playbook.title}</h1>

            {playbook.description && (
              <p className="playbook-cover-description">
                {playbook.description}
              </p>
            )}
          </div>

          <div className="playbook-cover-meta">
            <div>
              <span>Audience</span>
              <strong>{formatAudience(playbook.audience)}</strong>
            </div>

            <div>
              <span>Displays</span>
              <strong>{posts.length}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{playbook.playbookStatus ?? "draft"}</strong>
            </div>
          </div>
        </div>

        <div className="playbook-cover-visual">
          {primaryHeroImage ? (
            <img src={primaryHeroImage} alt="" />
          ) : (
            <div className="playbook-cover-placeholder">
              Build from what worked before.
            </div>
          )}
        </div>
      </section>

      <section className="playbook-guidance-grid">
        <div className="playbook-guidance-card playbook-guidance-card-primary">
          <p className="playbook-section-label">Manager Intent</p>
          <h2>How to use this playbook</h2>
          <p>
            Use these displays as starting points. The goal is not to copy every
            detail exactly. The goal is to understand what worked, adapt it to
            the account, and execute with confidence.
          </p>
        </div>

        {playbook.whenToUse && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">When to Use</p>
            <h3>{playbook.whenToUse}</h3>
          </div>
        )}

        {playbook.executionGoal && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Execution Goal</p>
            <p>{playbook.executionGoal}</p>
          </div>
        )}

        {playbook.managerNotes && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Manager Notes</p>
            <p>{playbook.managerNotes}</p>
          </div>
        )}
      </section>

      <section className="playbook-featured-section">
        <div className="playbook-section-heading">
          <p className="playbook-section-label">Featured Displays</p>
          <h2>Start with these examples</h2>
          <p>
            These displays should anchor the team’s thinking. Look at structure,
            product placement, account fit, seasonal timing, and how the display
            supports the program goal.
          </p>
        </div>

        {featuredPosts.length === 0 ? (
          <div className="playbook-empty-panel">
            No featured displays have been added yet.
          </div>
        ) : (
          <div className="playbook-featured-grid">
            {featuredPosts.map((post, index) => (
              <article className="playbook-featured-card" key={post.id}>
                <div className="playbook-featured-image">
                  {getPostImage(post) ? (
                    <img src={getPostImage(post)} alt={getDisplayTitle(post)} />
                  ) : (
                    <div className="playbook-image-placeholder">
                      Display photo
                    </div>
                  )}

                  <span className="playbook-featured-number">
                    Featured {index + 1}
                  </span>
                </div>

                <div className="playbook-featured-body">
                  <h3>{getDisplayTitle(post)}</h3>

                  <div className="playbook-display-meta">
                    {post.accountName && <span>{post.accountName}</span>}
                    {post.chain && <span>{post.chain}</span>}
                    {post.city && post.state && (
                      <span>
                        {post.city}, {post.state}
                      </span>
                    )}
                  </div>

                  {post.brands && post.brands.length > 0 && (
                    <div className="playbook-chip-row">
                      {post.brands?.slice(0, 5).map((brand) => (
                        <span className="playbook-chip" key={brand}>
                          {brand}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.description && (
                    <p className="playbook-display-description">
                      {post.description}
                    </p>
                  )}

                  <div className="playbook-rep-note">
                    <strong>Rep takeaway:</strong> Use this example to guide
                    display shape, brand focus, and account-level execution.
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="playbook-supporting-section">
        <div className="playbook-section-heading">
          <p className="playbook-section-label">Supporting Examples</p>
          <h2>More displays to build from</h2>
          <p>
            Use these additional examples for variation across account types,
            store sizes, chains, and available floor space.
          </p>
        </div>

        {supportingPosts.length === 0 ? (
          <div className="playbook-empty-panel">
            No supporting displays have been added yet.
          </div>
        ) : (
          <div className="playbook-supporting-grid">
            {supportingPosts.map((post) => (
              <article className="playbook-supporting-card" key={post.id}>
                <div className="playbook-supporting-image">
                  {getPostImage(post) ? (
                    <img src={getPostImage(post)} alt={getDisplayTitle(post)} />
                  ) : (
                    <div className="playbook-image-placeholder">
                      Display photo
                    </div>
                  )}
                </div>

                <div className="playbook-supporting-body">
                  <h3>{getDisplayTitle(post)}</h3>

                  <div className="playbook-display-meta">
                    {post.accountName && <span>{post.accountName}</span>}
                    {post.chain && <span>{post.chain}</span>}
                  </div>

                  {post.brands && post.brands?.length > 0 && (
                    <p className="playbook-supporting-brands">
                      {post.brands.slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="playbook-footer">
        <div>
          <strong>Displaygram</strong>
          <p>
            Built to help retail teams stop starting every display program from
            scratch.
          </p>
        </div>

        <span>{playbook.title}</span>
      </footer>
    </article>
  );
};

export default PlaybookDetailView;