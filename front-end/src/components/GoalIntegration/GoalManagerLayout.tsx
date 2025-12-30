// GoalManager.tsx
import React, { useState } from "react";
import "./goalManagerLayout.css";
import AllGoalsLayout from "./AllGoalsLayout";
import CreateGoalsLayout from "./CreateGoalsLayout";

interface GoalManagerLayoutProps {
  companyId?: string;
}

type goalManagerMode = "all" | "create";

const GoalManagerLayout: React.FC<GoalManagerLayoutProps> = ({ companyId }) => {
  

  const [goalManagerMode, setGoalManagerMode] =
    useState<goalManagerMode>("all");

  return (
    <section className="goal-manager">
      <h2 className="goal-manager-title">Goals Manager</h2>

      {/* ===============================
          DISPLAYGRAM GOALS
         =============================== */}
      <section className="goal-section">
        <header className="goal-section-header">

          <div className="goal-section-tabs">
            <button
              className={
                goalManagerMode === "all"
                  ? "gm-tab gm-tab-active"
                  : "gm-tab"
              }
              onClick={() => setGoalManagerMode("all")}
            >
              All Goals
            </button>

            <button
              className={
                goalManagerMode === "create"
                  ? "gm-tab gm-tab-active"
                  : "gm-tab"
              }
              onClick={() => setGoalManagerMode("create")}
            >
              Create Goals
            </button>
          </div>
        </header>
        
        <div className="goal-section-body">
          {goalManagerMode === "all" && (
            <AllGoalsLayout companyId={companyId} />
          )}

          {goalManagerMode === "create" && <CreateGoalsLayout companyId={companyId} />}
        </div>
      </section>

    </section>
  );
};

export default GoalManagerLayout;
