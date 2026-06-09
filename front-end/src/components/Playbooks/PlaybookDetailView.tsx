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
  onAddForecast?: (forecast: CreatePlaybookForecastInput) => Promise<void>;

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
  onAddForecast,
  onBack,
  onExportPdf,
  onShare,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);

  const [selectedAccountNumber, setSelectedAccountNumber] = useState("");
  const [estimatedCases, setEstimatedCases] = useState("");
  const [forecastNotes, setForecastNotes] = useState("");
  const [selectedSourcePostId, setSelectedSourcePostId] = useState("");
  const [isSubmittingForecast, setIsSubmittingForecast] = useState(false);

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

    const casesNumber = Number(estimatedCases);

    if (estimatedCases && (Number.isNaN(casesNumber) || casesNumber < 0)) {
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
        sourcePostId: selectedSourcePostId || undefined,
      });

      setSelectedAccountNumber("");
      setEstimatedCases("");
      setForecastNotes("");
      setSelectedSourcePostId("");

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

        {playbook.coachNotes && (
          <div className="playbook-guidance-card">
            <p className="playbook-section-label">Coach&apos;s Notes</p>
            <p>{playbook.coachNotes}</p>
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

        {featuredDisplays.length === 0 ? (
          <div className="playbook-empty-panel">
            No featured plays have been added yet.
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

                  {display.description && <p>{display.description}</p>}

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
              Example play this account could reflect
              <select
                value={selectedSourcePostId}
                onChange={(e) => setSelectedSourcePostId(e.target.value)}
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
              />
            </label>

            <label>
              Notes
              <textarea
                value={forecastNotes}
                onChange={(e) => setForecastNotes(e.target.value)}
                placeholder="Optional: why this account is a good fit, space concerns, timing, manager interest..."
                rows={3}
              />
            </label>

            <button
              type="submit"
              className="button-primary"
              disabled={isSubmittingForecast || !selectedAccountNumber}
            >
              {isSubmittingForecast ? "Adding..." : "Add to Forecast"}
            </button>
          </form>

          <aside className="playbook-forecast-summary">
            <h3>Team Forecast</h3>

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

            <div className="playbook-user-forecast">
              <h4>Your Forecast</h4>

              {userForecasts.length === 0 ? (
                <p>No accounts added yet.</p>
              ) : (
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
              )}
            </div>
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
                  {display.description && <p>{display.description}</p>}
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
