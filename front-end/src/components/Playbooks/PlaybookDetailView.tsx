// src/components/Playbooks/PlaybookDetailView.tsx
import React, { useMemo } from "react";
import {
  CollectionType,
  PlaybookPostSnapshot,
  PostWithID,
} from "../../utils/types";
import "./playbookDetailView.css";

interface PlaybookDetailViewProps {
  playbook: CollectionType;
  posts?: PostWithID[];
  onBack?: () => void;
  onExportPdf?: () => void;
  onShare?: () => void;
}

type PlaybookDisplay = PlaybookPostSnapshot;

const formatAudience = (audience?: CollectionType["audience"]) => {
  if (!audience || audience === "all") return "All Team Members";
  if (audience === "sales") return "Sales Team";
  if (audience === "supervisors") return "Supervisors";
  return audience;
};

const buildSnapshotFromPost = (post: PostWithID): PlaybookDisplay => ({
  postId: post.id,
  imageUrl: post.imageUrl || "",
  originalImageUrl: post.originalImageUrl || "",

  accountName: post.accountName || post.account?.accountName || "",
  accountNumber:
    post.accountNumber?.toString() ||
    post.account?.accountNumber?.toString() ||
    "",
  accountAddress: post.accountAddress || post.account?.accountAddress || "",
  city: post.city || post.account?.city || "",
  state: post.state || post.account?.state || "",
  chain: post.chain || post.account?.chain || "",
  chainType: post.chainType || post.account?.chainType || "",

  brands: post.brands ?? [],
  brandIds: post.brandIds ?? [],
  productType: post.productType ?? [],

  description: post.description || "",
  totalCaseCount: Number(post.totalCaseCount ?? 0),

  postUserUid: post.postUserUid || post.postUser?.uid || "",
  postUserFirstName: post.postUserFirstName || post.postUser?.firstName || "",
  postUserLastName: post.postUserLastName || post.postUser?.lastName || "",
  postUserCompanyName: post.postUserCompanyName || post.postUser?.company || "",

  displayDate:
    typeof post.displayDate === "string"
      ? post.displayDate
      : (post.displayDate as any)?.toDate?.()?.toISOString?.() || "",
});

const getDisplayImage = (display?: PlaybookDisplay | null) =>
  display?.imageUrl || display?.originalImageUrl || "";

const getDisplayTitle = (display: PlaybookDisplay) => {
  const accountName = display.accountName;
  const brand = display.brands?.[0];

  if (brand && accountName) return `${brand} display at ${accountName}`;
  if (accountName) return `Display at ${accountName}`;
  if (brand) return `${brand} display`;

  return "Retail display example";
};

const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  playbook,
  posts = [],
  onBack,
  onExportPdf,
  onShare,
}) => {
  const allDisplays = useMemo<PlaybookDisplay[]>(() => {
    const snapshots = playbook.playbookPostSnapshots ?? [];

    if (snapshots.length > 0) return snapshots;

    return posts.map(buildSnapshotFromPost);
  }, [playbook.playbookPostSnapshots, posts]);

  const featuredDisplays = useMemo<PlaybookDisplay[]>(() => {
    const featuredSnapshots = playbook.featuredPostSnapshots ?? [];

    if (featuredSnapshots.length > 0) return featuredSnapshots;

    const featuredIds = playbook.featuredPostIds ?? [];

    if (featuredIds.length > 0) {
      const featuredSet = new Set(featuredIds);
      return allDisplays.filter((display) => featuredSet.has(display.postId));
    }

    return allDisplays.slice(0, 3);
  }, [playbook.featuredPostSnapshots, playbook.featuredPostIds, allDisplays]);

  const supportingDisplays = useMemo<PlaybookDisplay[]>(() => {
    const featuredIds = new Set(
      featuredDisplays.map((display) => display.postId),
    );

    return allDisplays.filter((display) => !featuredIds.has(display.postId));
  }, [allDisplays, featuredDisplays]);

  const primaryHeroImage = getDisplayImage(
    featuredDisplays[0] ?? allDisplays[0],
  );

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

          <button
            type="button"
            className="button-primary"
            onClick={onExportPdf}
          >
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
              <strong>{allDisplays.length}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{playbook.playbookStatus ?? "draft"}</strong>
            </div>
          </div>
        </div>

        <div className="playbook-cover-visual">
          {primaryHeroImage ? (
            <img src={primaryHeroImage} alt={playbook.title} />
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

        {featuredDisplays.length === 0 ? (
          <div className="playbook-empty-panel">
            No featured displays have been added yet.
          </div>
        ) : (
          <div className="playbook-featured-grid">
            {featuredDisplays.map((display, index) => (
              <article
                className="playbook-featured-card"
                key={`${display.postId}-featured-${index}`}
              >
                <div className="playbook-featured-image">
                  {getDisplayImage(display) ? (
                    <img
                      src={getDisplayImage(display)}
                      alt={getDisplayTitle(display)}
                    />
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
                  <h3>{getDisplayTitle(display)}</h3>

                  <div className="playbook-display-meta">
                    {display.accountName && <span>{display.accountName}</span>}
                    {display.chain && <span>{display.chain}</span>}
                    {display.city && display.state && (
                      <span>
                        {display.city}, {display.state}
                      </span>
                    )}
                  </div>

                  {display.brands && display.brands.length > 0 && (
                    <div className="playbook-chip-row">
                      {display.brands.slice(0, 5).map((brand) => (
                        <span className="playbook-chip" key={brand}>
                          {brand}
                        </span>
                      ))}
                    </div>
                  )}

                  {display.description && (
                    <p className="playbook-display-description">
                      {display.description}
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

        {supportingDisplays.length === 0 ? (
          <div className="playbook-empty-panel">
            No supporting displays have been added yet.
          </div>
        ) : (
          <div className="playbook-supporting-grid">
            {supportingDisplays.map((display) => (
              <article
                className="playbook-supporting-card"
                key={display.postId}
              >
                <div className="playbook-supporting-image">
                  {getDisplayImage(display) ? (
                    <img
                      src={getDisplayImage(display)}
                      alt={getDisplayTitle(display)}
                    />
                  ) : (
                    <div className="playbook-image-placeholder">
                      Display photo
                    </div>
                  )}
                </div>

                <div className="playbook-supporting-body">
                  <h3>{getDisplayTitle(display)}</h3>

                  <div className="playbook-display-meta">
                    {display.accountName && <span>{display.accountName}</span>}
                    {display.chain && <span>{display.chain}</span>}
                  </div>

                  {display.brands && display.brands.length > 0 && (
                    <p className="playbook-supporting-brands">
                      {display.brands.slice(0, 3).join(", ")}
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