import { Dialog, DialogContent } from "@mui/material";
import { useMemo, useState } from "react";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { getGalloGoalSummary } from "./utils/getGalloGoalSummary";

import "./galloGoalProgressOverlay.css";

type Props = {
  goal: FireStoreGalloGoalWithId;
  employeeMap: Record<string, string>;
  onClose: () => void;
  onEdit: () => void;
  onViewPost: (postId: string) => void;
};

type SubmissionFilter = "all" | "submitted" | "pending";

const GalloGoalProgressOverlay = ({
  goal,
  employeeMap,
  onClose,
  onEdit,
  onViewPost,
}: Props) => {
  const [filter, setFilter] = useState<SubmissionFilter>("all");
  const [search, setSearch] = useState("");
  const summary = getGalloGoalSummary(goal);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return summary.activeAccounts.filter((account) => {
      const submitted = Boolean(account.submittedPostId);
      const matchesFilter =
        filter === "all" ||
        (filter === "submitted" && submitted) ||
        (filter === "pending" && !submitted);
      const matchesSearch =
        !query ||
        [
          account.accountName,
          account.distributorAcctId,
          account.accountAddress,
        ].some((value) => value?.toLocaleLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, summary.activeAccounts]);

  return (
    <Dialog
      open
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      PaperProps={{ className: "gallo-progress-dialog" }}
    >
      <header className="gallo-progress-dialog__header">
        <div>
          <span className="gallo-progress-dialog__eyebrow">
            Account progress
          </span>
          <h2>{goal.programDetails.programTitle}</h2>
          <p>
            {summary.submittedCount} of {summary.totalAccounts} active accounts
            have submitted a display.
          </p>
        </div>
        <div className="gallo-progress-dialog__actions">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit accounts
          </button>
          <button
            type="button"
            className="gallo-progress-dialog__close"
            aria-label="Close progress details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      <DialogContent className="gallo-progress-dialog__content">
        <section
          className="gallo-progress-overview"
          aria-label="Goal completion"
        >
          <div className="gallo-progress-overview__number">
            <strong>{summary.percent}%</strong>
            <span>complete</span>
          </div>
          <div className="gallo-progress-overview__bar">
            <div
              className="gallo-goals-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.percent}
            >
              <span style={{ width: `${summary.percent}%` }} />
            </div>
            <small>
              {summary.totalAccounts - summary.submittedCount} pending ·{" "}
              {summary.excludedAccounts.length} excluded
            </small>
          </div>
        </section>

        <div className="gallo-progress-toolbar">
          <label>
            <span>Search accounts</span>
            <input
              type="search"
              placeholder="Name, account number, or address…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="gallo-progress-filters" aria-label="Filter accounts">
            {(["all", "submitted", "pending"] as SubmissionFilter[]).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  className={filter === option ? "is-active" : ""}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                >
                  {option}
                </button>
              ),
            )}
          </div>
        </div>

        {visibleAccounts.length === 0 ? (
          <div className="gallo-progress-empty">
            No accounts match this view.
          </div>
        ) : (
          <div className="gallo-progress-account-grid">
            {visibleAccounts.map((account) => {
              const submitted = Boolean(account.submittedPostId);
              const routes = Array.isArray(account.salesRouteNums)
                ? account.salesRouteNums
                : [account.salesRouteNums];
              return (
                <article
                  key={account.oppId || account.distributorAcctId}
                  className={`gallo-progress-account ${submitted ? "is-submitted" : "is-pending"}`}
                >
                  <div className="gallo-progress-account__heading">
                    <span className="gallo-progress-account__state">
                      <span aria-hidden="true">{submitted ? "✓" : "○"}</span>
                      {submitted ? "Submitted" : "Pending"}
                    </span>
                    <strong>{account.accountName}</strong>
                    <small>{account.distributorAcctId}</small>
                  </div>
                  <dl>
                    <div>
                      <dt>Route</dt>
                      <dd>{routes.filter(Boolean).join(", ") || "—"}</dd>
                    </div>
                    <div>
                      <dt>Salesperson</dt>
                      <dd>{employeeMap[routes[0]] || "Unassigned"}</dd>
                    </div>
                  </dl>
                  {account.submittedPostId && (
                    <button
                      type="button"
                      onClick={() => onViewPost(account.submittedPostId!)}
                    >
                      View display
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GalloGoalProgressOverlay;
