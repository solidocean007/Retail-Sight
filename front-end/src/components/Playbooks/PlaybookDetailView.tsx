// src/components/Playbooks/PlaybookDetailView.tsx
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { PostWithID, CompanyAccountType } from "../../utils/types";
import { selectUser } from "../../Slices/userSlice";
import { showMessage } from "../../Slices/snackbarSlice";
import { useAppDispatch } from "../../utils/store";
import {
  CollectionType,
  CreatePlaybookForecastInput,
  PlaybookForecast,
  PlaybookPostSnapshot,
} from "../../types/library";
import "./playbookDetailView.css";

interface PlaybookDetailViewProps {
  playbook: CollectionType;
  posts?: PostWithID[];

  accounts?: CompanyAccountType[];
  forecasts?: PlaybookForecast[];
  isLoadingForecasts?: boolean;
  onAddForecast?: (forecast: CreatePlaybookForecastInput) => Promise<void>;
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

const formatAccountLabel = (account: CompanyAccountType) => {
  const name = account.accountName ?? "Unknown Account";
  const number = account.accountNumber ? `#${account.accountNumber}` : "";
  const address = account.accountAddress ? ` — ${account.accountAddress}` : "";

  return `${name} ${number}${address}`.trim();
};

const PlaybookDetailView: React.FC<PlaybookDetailViewProps> = ({
  playbook,
  posts = [],
  accounts = [],
  forecasts = [],
  isLoadingForecasts = false,
  onAddForecast,
  onUpdatePlay,
  onBack,
  onExportPdf,
  onShare,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const canEditPlays = canManagePlaybooksByRole(user?.role);

  const [selectedAccountNumber, setSelectedAccountNumber] = useState("");
  const [estimatedCases, setEstimatedCases] = useState("");
  const [forecastNotes, setForecastNotes] = useState("");
  const [selectedSourcePostId, setSelectedSourcePostId] = useState("");
  const [selectedHelpNeeded, setSelectedHelpNeeded] = useState<string[]>([]);
  const [isSubmittingForecast, setIsSubmittingForecast] = useState(false);
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

  const selectedAccount = useMemo(() => {
    return accounts.find(
      (account) => account.accountNumber?.toString() === selectedAccountNumber,
    );
  }, [accounts, selectedAccountNumber]);

  const playbookForecasts = useMemo(() => {
    return forecasts.filter((forecast) => forecast.playbookId === playbook.id);
  }, [forecasts, playbook.id]);

  const userForecasts = useMemo(() => {
    if (!user?.uid) return [];

    return playbookForecasts.filter((forecast) => forecast.userId === user.uid);
  }, [playbookForecasts, user?.uid]);

  const forecastSummary = useMemo(() => {
    const participatingUsers = new Set(playbookForecasts.map((f) => f.userId));
    const accountNumbers = new Set(
      playbookForecasts.map((f) => f.accountNumber),
    );

    return {
      totalAccounts: accountNumbers.size,
      totalEstimatedCases: playbookForecasts.reduce(
        (sum, f) => sum + (Number(f.estimatedCases) || 0),
        0,
      ),
      plannedCount: playbookForecasts.filter((f) => f.status === "planned")
        .length,
      pitchedCount: playbookForecasts.filter((f) => f.status === "pitched")
        .length,
      approvedCount: playbookForecasts.filter((f) => f.status === "approved")
        .length,
      executedCount: playbookForecasts.filter((f) => f.status === "executed")
        .length,
      missedCount: playbookForecasts.filter((f) => f.status === "missed")
        .length,
      participatingUserCount: participatingUsers.size,
    };
  }, [playbookForecasts]);

  const DEFAULT_HELP_OPTIONS = [
    "Help building display",
    "Assistance asking for approval",
    "Case cards needed",
    "Display piece needed",
  ];

  const helpOptions =
    playbook.helpNeededOptions?.length
      ? playbook.helpNeededOptions
      : DEFAULT_HELP_OPTIONS;

  const allHelpOptions = helpOptions.includes("Other")
    ? helpOptions
    : [...helpOptions, "Other"];

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

  const handleSubmitForecast = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.uid || !user.companyId) {
      dispatch(showMessage("You must be signed in to forecast this play."));
      return;
    }

    if (!onAddForecast) {
      dispatch(showMessage("Forecasting is not available yet."));
      return;
    }

    if (!selectedAccount) {
      dispatch(showMessage("Choose an account first."));
      return;
    }

    if (!selectedSourcePostId) {
      dispatch(showMessage("Choose a play first."));
      return;
    }

    if (!estimatedCases.trim()) {
      dispatch(showMessage("Enter an estimated case count."));
      return;
    }

    const casesNumber = Number(estimatedCases);

    if (Number.isNaN(casesNumber) || casesNumber < 0) {
      dispatch(showMessage("Estimated cases must be a valid number."));
      return;
    }

    setIsSubmittingForecast(true);

    try {
      await onAddForecast({
        playbookId: playbook.id,
        companyId: user.companyId,

        userId: user.uid,
        userFirstName: user.firstName,
        userLastName: user.lastName,
        userSalesRouteNum: user.salesRouteNum,

        accountNumber: selectedAccount.accountNumber?.toString() || "",
        accountName: selectedAccount.accountName,
        accountAddress: selectedAccount.accountAddress,
        city: selectedAccount.city,
        state: selectedAccount.state,
        chain: selectedAccount.chain,
        chainType: selectedAccount.chainType,

        estimatedCases: estimatedCases ? casesNumber : undefined,
        status: "planned",

        notes: forecastNotes.trim() || undefined,
        helpNeeded: selectedHelpNeeded.length > 0 ? selectedHelpNeeded : undefined,
        sourcePostId: selectedSourcePostId || undefined,
      });

      setSelectedAccountNumber("");
      setEstimatedCases("");
      setForecastNotes("");
      setSelectedSourcePostId("");
      setSelectedHelpNeeded([]);

      dispatch(showMessage("Play forecast added."));
    } catch (error) {
      console.error("Error adding playbook forecast:", error);
      dispatch(showMessage("Could not add forecast."));
    } finally {
      setIsSubmittingForecast(false);
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

      <section className="playbook-forecast-section no-print">
        <div className="playbook-section-heading">
          <p className="playbook-section-label">Run the Play</p>
          <h2>Forecast where this can execute</h2>
          <p>
            Choose accounts where you think this playbook can work and estimate
            the case opportunity. This gives the team a forecast before displays
            are actually built.
          </p>
        </div>

        <div className="playbook-forecast-layout">
          {accounts.length === 0 ? (
            <div className="playbook-empty-panel">
              No accounts available yet. Account selection will be wired next.
            </div>
          ) : (
            <form
              className="playbook-forecast-form"
              onSubmit={handleSubmitForecast}
            >
              <label>
                Account
                <select
                  value={selectedAccountNumber}
                  onChange={(e) => setSelectedAccountNumber(e.target.value)}
                  required
                >
                  <option value="">Choose an account</option>
                  {accounts.map((account) => (
                    <option
                      key={account.accountNumber?.toString()}
                      value={account.accountNumber?.toString()}
                    >
                      {formatAccountLabel(account)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Which play does this account fit?
                <select
                  value={selectedSourcePostId}
                  onChange={(e) => setSelectedSourcePostId(e.target.value)}
                  required
                >
                  <option value="">No specific play</option>
                  {allDisplays.map((display) => (
                    <option key={display.postId} value={display.postId}>
                      {getDisplayTitle(display)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Estimated Cases
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={estimatedCases}
                  onChange={(e) => setEstimatedCases(e.target.value)}
                  placeholder="Example: 25"
                  required
                />
              </label>

              <details className="playbook-help-needed-details">
                <summary className="playbook-help-needed-summary">
                  <span>Help Needed</span>
                  {selectedHelpNeeded.length > 0 && (
                    <span className="playbook-help-needed-badge">
                      {selectedHelpNeeded.length} selected
                    </span>
                  )}
                </summary>
                <p className="playbook-help-needed-hint">
                  Check anything you need to make this happen.
                </p>
                <div className="playbook-help-needed-options">
                  {allHelpOptions.map((opt) => (
                    <label key={opt} className="playbook-help-needed-option">
                      <input
                        type="checkbox"
                        checked={selectedHelpNeeded.includes(opt)}
                        onChange={() =>
                          setSelectedHelpNeeded((prev) =>
                            prev.includes(opt)
                              ? prev.filter((o) => o !== opt)
                              : [...prev, opt],
                          )
                        }
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </details>

              <label>
                Notes
                <textarea
                  value={forecastNotes}
                  onChange={(e) => setForecastNotes(e.target.value)}
                  placeholder="Why this account is a good fit — space availability, timing, manager interest, current display status…"
                  rows={5}
                />
              </label>

              <button
                type="submit"
                className="button-primary"
                disabled={
                  isSubmittingForecast ||
                  !selectedAccountNumber ||
                  !selectedSourcePostId ||
                  !estimatedCases.trim()
                }
              >
                {isSubmittingForecast ? "Adding..." : "Add to Forecast"}
              </button>
            </form>
          )}

          <aside className="playbook-forecast-summary">
            <h3>Team Forecast</h3>

            {isLoadingForecasts && (
              <p className="playbook-forecast-loading">Loading forecast...</p>
            )}

            <div className="playbook-forecast-stat-grid">
              <div>
                <span>Accounts</span>
                <strong>{forecastSummary.totalAccounts}</strong>
              </div>

              <div>
                <span>Estimated Cases</span>
                <strong>{forecastSummary.totalEstimatedCases}</strong>
              </div>

              <div>
                <span>Reps</span>
                <strong>{forecastSummary.participatingUserCount}</strong>
              </div>

              <div>
                <span>Planned</span>
                <strong>{forecastSummary.plannedCount}</strong>
              </div>
            </div>

            {userForecasts.length > 0 && (
              <div className="playbook-user-forecast">
                <h4>Your Forecast</h4>
                <ul>
                  {userForecasts.map((forecast) => (
                    <li key={forecast.id}>
                      <strong>{forecast.accountName}</strong>
                      <span>
                        {forecast.estimatedCases
                          ? `${forecast.estimatedCases} cases`
                          : "No case estimate"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {playbookForecasts.length > 0 && (
              <div className="playbook-team-forecast-list">
                <h4>All Forecasted Accounts</h4>
                <ul>
                  {playbookForecasts.map((forecast) => {
                    const isOwn = forecast.userId === user?.uid;
                    return (
                      <li key={forecast.id} className={isOwn ? "playbook-forecast-own" : ""}>
                        <div className="playbook-forecast-account-row">
                          <strong>{forecast.accountName}</strong>
                          {forecast.estimatedCases ? (
                            <span>{forecast.estimatedCases} cases</span>
                          ) : null}
                        </div>
                        {(forecast.userFirstName || forecast.userLastName) && (
                          <span className="playbook-forecast-rep">
                            {[forecast.userFirstName, forecast.userLastName]
                              .filter(Boolean)
                              .join(" ")}
                            {isOwn ? " (you)" : ""}
                          </span>
                        )}
                        {forecast.helpNeeded && forecast.helpNeeded.length > 0 && (
                          <span className="playbook-forecast-help">
                            Needs: {forecast.helpNeeded.join(", ")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {playbookForecasts.length === 0 && !isLoadingForecasts && (
              <p className="playbook-forecast-empty">
                No forecasts yet. Be the first to add accounts.
              </p>
            )}
          </aside>
        </div>
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
