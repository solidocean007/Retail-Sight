import React, { useMemo } from "react";
import "./galloGoalsHeatMap.css";
import { FireStoreGalloGoalWithId } from "../../Slices/galloGoalsSlice";

type Props = {
  goals: FireStoreGalloGoalWithId[];
  onClickGoal?: (goalId: string) => void;
};

const getColor = (percent: number) => {
  if (percent === 0) return "#2c2c2c";
  if (percent < 25) return "#7f1d1d";
  if (percent < 50) return "#b45309";
  if (percent < 75) return "#15803d";
  return "#065f46";
};

export default function GalloGoalsHeatMap({
  goals,
  onClickGoal,
}: Props) {
  const heatData = useMemo(() => {
    return goals.map((goal) => {
      const activeAccounts = goal.accounts.filter(
        (a) => a.status === "active"
      );

      const submitted = activeAccounts.filter(
        (a) => a.submittedPostId
      ).length;

      const total = activeAccounts.length || 1;
      const percent = Math.round((submitted / total) * 100);

      return {
        id: goal.id,
        title: goal.programDetails.programTitle,
        percent,
        submitted,
        total,
      };
    });
  }, [goals]);

  return (
    <section className="gallo-heatmap-container">

      <div className="heatmap-header">
        <h3>Program Health Map</h3>

        <div className="heatmap-legend">
          <div><span className="legend-box l0" /> 0%</div>
          <div><span className="legend-box l1" /> 1–24%</div>
          <div><span className="legend-box l2" /> 25–49%</div>
          <div><span className="legend-box l3" /> 50–74%</div>
          <div><span className="legend-box l4" /> 75–100%</div>
        </div>
      </div>

      <div className="gallo-heatmap-grid">
        {heatData.map((goal) => (
          <div
            key={goal.id}
            className="gallo-heatmap-cell"
            style={{ backgroundColor: getColor(goal.percent) }}
            onClick={() => onClickGoal?.(goal.id)}
          >
            <span className="heatmap-percent">
              {goal.percent}%
            </span>

            {/* Tooltip INSIDE the cell */}
            <div className="heatmap-tooltip">
              <div className="tooltip-title">{goal.title}</div>
              <div>
                {goal.submitted} / {goal.total}
              </div>
              <div>{goal.percent}% Complete</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
