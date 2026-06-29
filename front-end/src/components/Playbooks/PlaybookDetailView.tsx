// src/components/Playbooks/PlaybookDetailView.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { CompanyGoalWithIdType, PostWithID } from "../../utils/types";
import { selectUser } from "../../Slices/userSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import {
  CollectionType,
  PlaybookPostSnapshot,
} from "../../types/library";
import "./playbookDetailView.css";

interface PlaybookDetailViewProps {
  playbook: CollectionType;
  posts?: PostWithID[];
  usedGoals?: Array<{
    goal: CompanyGoalWithIdType;
    assignedAccountsCount: number;
    completedDisplaysCount: number;
  }>;
  onUpdatePlay?: (inputPostId: string, input: {
    playName: string;
    playDescription?: string;
  }) => Promise<void>;

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

const canManagePlaybooksByRole = (role?: string | null) =>
  role === "admin" ||
  role === "super-admin" ||
  role === "supervisor" ||
  role === "developer";

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

const buildDefaultPlayName = (display: PlaybookDisplay) => {
  const roundedCases =
    Number.isFinite(Number(display.totalCaseCount)) &&
    Number(display.totalCaseCount) > 0
      ? Math.round(Number(display.totalCaseCount))
      : 0;
  const productType = display.productType?.[0]?.trim();
  const brand = display.brands?.[0]?.trim();

  if (roundedCases && productType) {
    return `${roundedCases} Case ${productType} Display`;
  }
  if (roundedCases && brand) {
    return `${roundedCases} Case ${brand} Display`;
  }
  if (productType) {
    return `${productType} Display`;
  }
  if (brand) {
    return `${brand} Display`;
  }

  return "Retail Display Play";
};

const getDisplayTitle = (display: PlaybookDisplay) => {
  const playName = display.playName?.trim();
  if (playName) return playName;

  return buildDefaultPlayName(display);
};

const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  playbook,
  posts = [],
  usedGoals = [],
  onUpdatePlay,
  onBack,
  onExportPdf,
  onShare,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const canEditPlays = canManagePlaybooksByRole(user?.role);

  const [editingPlayPostId, setEditingPlayPostId] = useState<string | null>(null);
  const [editingPlayName, setEditingPlayName] = useState("");
  const [editingPlayDescription, setEditingPlayDescription] = useState("");
  const [isSavingPlay, setIsSavingPlay] = useState(false);

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
    const featuredIds = new Set(featuredDisplays.map((d) => d.postId));
    return allDisplays.filter((display) => !featuredIds.has(display.postId));
  }, [allDisplays, featuredDisplays]);

  const primaryHeroImage = getDisplayImage(
    featuredDisplays[0] ?? allDisplays[0],
  );

  const coachNotes =
    playbook.coachNotes ?? (playbook as CollectionType & { managerNotes?: string }).managerNotes;

  const sortedUsedGoals = useMemo(() => {
    return [...usedGoals].sort((a, b) =>
      a.goal.goalTitle.localeCompare(b.goal.goalTitle),
    );
  }, [usedGoals]);

  const startEditingPlay = (display: PlaybookDisplay) => {
    setEditingPlayPostId(display.postId);
    setEditingPlayName(display.playName?.trim() || getDisplayTitle(display));
    setEditingPlayDescription(display.playDescription?.trim() || "");
  };

  const stopEditingPlay = () => {
    setEditingPlayPostId(null);
    setEditingPlayName("");
    setEditingPlayDescription("");
  };

  const handleSavePlayDetails = async (display: PlaybookDisplay) => {
    const trimmedName = editingPlayName.trim();
    const trimmedDescription = editingPlayDescription.trim();

    if (!trimmedName) {
      dispatch(showMessage("Play name is required."));
      return;
    }

    if (!onUpdatePlay) {
      dispatch(showMessage("Play editing is not available yet."));
      return;
    }

    setIsSavingPlay(true);

    try {
      await onUpdatePlay(display.postId, {
        playName: trimmedName,
        playDescription: trimmedDescription || undefined,
      });
      stopEditingPlay();
    } catch (error) {
      console.error("Error updating play details:", error);
      dispatch(showMessage("Could not update this play."));
    } finally {
      setIsSavingPlay(false);
    }
  };

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
              <span>Team</span>
              <strong>{formatAudience(playbook.audience)}</strong>
            </div>

            <div>
              <span>Plays</span>
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
          <p className="playbook-section-label">Coach Intent</p>
          <h2>How to run this playbook</h2>
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

        {playbook.gamePlan && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Game Plan</p>
            <p>{playbook.gamePlan}</p>
          </div>
        )}

        {playbook.executionGoal && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Execution Goal</p>
            <p>{playbook.executionGoal}</p>
          </div>
        )}

        {coachNotes && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Coach&apos;s Notes</p>
            <p>{coachNotes}</p>
          </div>
        )}
      </section>

      <section className="playbook-featured-section">
        <div className="playbook-section-heading">
          <p className="playbook-section-label">Featured Plays</p>
          <h2>Start with these examples</h2>
          <p>
            These displays should anchor the team’s thinking. Look at structure,
            product placement, account fit, seasonal timing, and how the display
            supports the program goal.
          </p>
        </div>

        {canEditPlays && allDisplays.length > 0 && (
          <div className="playbook-admin-prompt no-print">
            <strong>Name Your Play:</strong> use a repeatable play type (example:
            5 Case Power Front of Store), not store-specific names.
          </div>
        )}

        {allDisplays.length === 0 ? (
          <div className="playbook-empty-panel">
            No plays added yet. Add displays from the feed or library to build
            this game plan.
          </div>
        ) : (
          <div className="playbook-featured-grid">
            {featuredDisplays.map((display, index) => (
              <article className="playbook-display-card" key={display.postId}>
                <div className="playbook-display-image-wrap">
                  {getDisplayImage(display) ? (
                    <img
                      src={getDisplayImage(display)}
                      alt={getDisplayTitle(display)}
                    />
                  ) : (
                    <div className="playbook-display-placeholder">No image</div>
                  )}
                </div>

                <div className="playbook-display-body">
                  <p className="playbook-section-label">Play {index + 1}</p>
                  <h3>{getDisplayTitle(display)}</h3>

                  {(display.playDescription || display.description) && (
                    <p>{display.playDescription || display.description}</p>
                  )}

                  {canEditPlays && (
                    <div className="playbook-edit-actions no-print">
                      {editingPlayPostId === display.postId ? (
                        <form
                          className="playbook-edit-play-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleSavePlayDetails(display);
                          }}
                        >
                          <label>
                            Play Name
                            <input
                              value={editingPlayName}
                              onChange={(event) =>
                                setEditingPlayName(event.target.value)
                              }
                              placeholder="Example: 5 Case Power Front of Store"
                              maxLength={80}
                              required
                            />
                          </label>

                          <label>
                            Short Play Description
                            <textarea
                              value={editingPlayDescription}
                              onChange={(event) =>
                                setEditingPlayDescription(event.target.value)
                              }
                              rows={2}
                              maxLength={200}
                              placeholder="Optional: quick guidance reps can apply in the field."
                            />
                          </label>

                          <div className="playbook-edit-play-actions">
                            <button
                              type="submit"
                              className="button-primary"
                              disabled={isSavingPlay}
                            >
                              {isSavingPlay ? "Saving..." : "Save Play"}
                            </button>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={stopEditingPlay}
                              disabled={isSavingPlay}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => startEditingPlay(display)}
                        >
                          Edit Play Name
                        </button>
                      )}
                    </div>
                  )}

                  {display.whyThisPlayWorks && (
                    <div className="playbook-callout">
                      <strong>Why this play works:</strong>
                      <p>{display.whyThisPlayWorks}</p>
                    </div>
                  )}

                  {display.suggestedExecution && (
                    <div className="playbook-callout">
                      <strong>Suggested execution:</strong>
                      <p>{display.suggestedExecution}</p>
                    </div>
                  )}

                  <div className="playbook-display-meta">
                    {display.accountName && <span>{display.accountName}</span>}
                    {display.brands?.length ? (
                      <span>{display.brands.join(", ")}</span>
                    ) : null}
                    {display.totalCaseCount ? (
                      <span>{display.totalCaseCount} cases</span>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="playbook-goal-usage-section no-print">
        <div className="playbook-section-heading">
          <p className="playbook-section-label">Used in Goals</p>
          <h2>Where this playbook is actively being executed</h2>
          <p>
            Playbooks are reusable guides. Active execution and account planning
            live in goal workspaces.
          </p>
        </div>

        {sortedUsedGoals.length === 0 ? (
          <div className="playbook-empty-panel">
            This playbook is not attached to any active goals yet.
          </div>
        ) : (
          <div className="playbook-goal-usage-list">
            {sortedUsedGoals.map(({ goal, assignedAccountsCount, completedDisplaysCount }) => (
              <details key={goal.id} className="playbook-goal-usage-item">
                <summary>
                  <span className="playbook-goal-usage-title">
                    {goal.goalTitle}
                  </span>
                  <span className="playbook-goal-usage-metrics">
                    Assigned: {assignedAccountsCount} • Completed displays:{" "}
                    {completedDisplaysCount}
                  </span>
                </summary>
                <div className="playbook-goal-usage-body">
                  <p>
                    <strong>Date range:</strong> {goal.goalStartDate} -{" "}
                    {goal.goalEndDate}
                  </p>
                  {goal.goalDescription && (
                    <p>
                      <strong>Goal:</strong> {goal.goalDescription}
                    </p>
                  )}
                  {goal.playbookReason && (
                    <p>
                      <strong>Why this playbook:</strong> {goal.playbookReason}
                    </p>
                  )}
                  {goal.playbookInstructions && (
                    <p>
                      <strong>Goal-specific instructions:</strong>{" "}
                      {goal.playbookInstructions}
                    </p>
                  )}
                  <p className="playbook-goal-usage-note">
                    Open the goal workspace to view rep account responses and
                    blocker breakdowns.
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {supportingDisplays.length > 0 && (
        <section className="playbook-supporting-section">
          <div className="playbook-section-heading">
            <p className="playbook-section-label">More Examples</p>
            <h2>Additional displays in this playbook</h2>
          </div>

          <div className="playbook-supporting-grid">
            {supportingDisplays.map((display) => (
              <article
                className="playbook-supporting-card"
                key={display.postId}
              >
                {getDisplayImage(display) && (
                  <img
                    src={getDisplayImage(display)}
                    alt={getDisplayTitle(display)}
                  />
                )}

                <div>
                  <h3>{getDisplayTitle(display)}</h3>
                  {(display.playDescription || display.description) && (
                    <p>{display.playDescription || display.description}</p>
                  )}

                  {canEditPlays && (
                    <div className="playbook-edit-actions no-print">
                      {editingPlayPostId === display.postId ? (
                        <form
                          className="playbook-edit-play-form"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleSavePlayDetails(display);
                          }}
                        >
                          <label>
                            Play Name
                            <input
                              value={editingPlayName}
                              onChange={(event) =>
                                setEditingPlayName(event.target.value)
                              }
                              placeholder="Example: 5 Case Power Front of Store"
                              maxLength={80}
                              required
                            />
                          </label>

                          <label>
                            Short Play Description
                            <textarea
                              value={editingPlayDescription}
                              onChange={(event) =>
                                setEditingPlayDescription(event.target.value)
                              }
                              rows={2}
                              maxLength={200}
                              placeholder="Optional: quick guidance reps can apply in the field."
                            />
                          </label>

                          <div className="playbook-edit-play-actions">
                            <button
                              type="submit"
                              className="button-primary"
                              disabled={isSavingPlay}
                            >
                              {isSavingPlay ? "Saving..." : "Save Play"}
                            </button>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={stopEditingPlay}
                              disabled={isSavingPlay}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => startEditingPlay(display)}
                        >
                          Edit Play Name
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export default PlaybookDetailView;
