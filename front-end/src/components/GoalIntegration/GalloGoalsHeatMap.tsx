import { useMemo, useState } from "react";

import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";
import { getGalloGoalSummary } from "./utils/getGalloGoalSummary";

import "./galloGoalsHeatMap.css";

type Props = {
  goals: FireStoreGalloGoalWithId[];
  onClickGoal?: (goalId: string) => void;
};

const getHeatLevel = (percent: number) => {
  if (percent === 0) return 0;
  if (percent < 25) return 1;
  if (percent < 50) return 2;
  if (percent < 75) return 3;
  return 4;
};

const GalloGoalsHeatMap = ({ goals, onClickGoal }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const heatData = useMemo(
    () =>
      goals.map((goal) => {
        const summary = getGalloGoalSummary(goal);

        return {
          id: goal.id,
          title: goal.programDetails.programTitle,
          percent: summary.percent,
          submitted: summary.submittedCount,
          total: summary.totalAccounts,
          level: getHeatLevel(summary.percent),
        };
      }),
    [goals],
  );

  const summary = useMemo(() => {
    const submitted = heatData.reduce(
      (total, goal) => total + goal.submitted,
      0,
    );
    const accounts = heatData.reduce((total, goal) => total + goal.total, 0);
    return {
      submitted,
      accounts,
      percent: accounts > 0 ? Math.round((submitted / accounts) * 100) : 0,
    };
  }, [heatData]);

  if (heatData.length === 0) return null;

  return (
    <section
      className={`gallo-heatmap-container ${expanded ? "is-expanded" : ""}`}
      aria-label="Current program health"
    >
      <button
        type="button"
        className="heatmap-summary"
        aria-expanded={expanded}
        aria-controls="gallo-program-health-details"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="heatmap-summary__copy">
          <span className="heatmap-summary__eyebrow">Program health</span>
          <strong>{summary.percent}% overall</strong>
          <small>
            {heatData.length} {heatData.length === 1 ? "goal" : "goals"} ·{" "}
            {summary.submitted}/{summary.accounts} accounts submitted
          </small>
        </span>

        <span className="heatmap-summary__visual" aria-hidden="true">
          <span className="heatmap-summary__bar">
            {heatData.map((goal) => (
              <span
                key={goal.id}
                className={`heatmap-summary__segment heat-level-${goal.level}`}
                title={`${goal.title}: ${goal.percent}%`}
              />
            ))}
          </span>
          <span className="heatmap-summary__hint">
            {expanded ? "Collapse" : "Explore"}
            <span className="heatmap-summary__chevron">⌄</span>
          </span>
        </span>
      </button>

      {expanded && (
        <div id="gallo-program-health-details" className="heatmap-details">
          <div className="heatmap-legend" aria-label="Completion legend">
            <div>
              <span className="legend-box heat-level-0" /> 0%
            </div>
            <div>
              <span className="legend-box heat-level-1" /> 1–24%
            </div>
            <div>
              <span className="legend-box heat-level-2" /> 25–49%
            </div>
            <div>
              <span className="legend-box heat-level-3" /> 50–74%
            </div>
            <div>
              <span className="legend-box heat-level-4" /> 75–100%
            </div>
          </div>

          <div className="gallo-heatmap-grid">
            {heatData.map((goal) => (
              <button
                type="button"
                key={goal.id}
                className={`gallo-heatmap-cell heat-level-${goal.level}`}
                onClick={() => onClickGoal?.(goal.id)}
                aria-label={`${goal.title}: ${goal.percent}% complete. View goal details.`}
              >
                <span className="heatmap-percent">{goal.percent}%</span>
                <span className="heatmap-tooltip" role="tooltip">
                  <span className="tooltip-title">{goal.title}</span>
                  <span>
                    {goal.submitted} / {goal.total} submitted
                  </span>
                  <span>{goal.percent}% complete</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default GalloGoalsHeatMap;
