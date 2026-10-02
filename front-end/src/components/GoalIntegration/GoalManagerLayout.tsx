import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import LiquorRoundedIcon from "@mui/icons-material/LiquorRounded";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import WineBarRoundedIcon from "@mui/icons-material/WineBarRounded";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";
import { selectGoalsByTiming } from "../../Slices/galloGoalsSlice";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import AllGoalsLayout, {
  type GalloGoalView,
  type GoalSource,
} from "./AllGoalsLayout";
import CreateGoalsLayout from "./CreateGoalsLayout";
import SupplierGoalsLayout from "./SupplierGoalsLayout";

import "./goalManagerLayout.css";

type GoalManagerLayoutProps = {
  companyId?: string;
};

const getTiming = (startDate: string, endDate: string) => {
  const today = new Date().toISOString().slice(0, 10);
  if (endDate && endDate < today) return "archived";
  if (startDate && startDate > today) return "upcoming";
  return "current";
};

const GoalManagerLayout = ({ companyId }: GoalManagerLayoutProps) => {
  const isSupplier = useSelector(selectIsSupplier);
  const companyGoals = useSelector(selectAllCompanyGoals);
  const galloGoalsByTiming = useSelector(selectGoalsByTiming);
  const { isEnabled, loading: integrationsLoading } =
    useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const [createOpen, setCreateOpen] = useState(false);
  const [source, setSource] = useState<GoalSource>("company");
  const [galloView, setGalloView] = useState<GalloGoalView>("current");

  useEffect(() => {
    if (!integrationsLoading && !galloEnabled && source === "gallo") {
      setSource("company");
    }
  }, [galloEnabled, integrationsLoading, source]);

  const counts = useMemo(
    () =>
      companyGoals.reduce(
        (summary, goal) => {
          summary[getTiming(goal.goalStartDate, goal.goalEndDate)] += 1;
          return summary;
        },
        { current: 0, upcoming: 0, archived: 0 },
      ),
    [companyGoals],
  );

  const summaryItems =
    source === "gallo"
      ? [
          {
            label: "Current",
            view: "current" as const,
            value: galloGoalsByTiming.current.length,
            detail: "Live Axis goals",
          },
          {
            label: "Upcoming",
            view: "upcoming" as const,
            value:
              galloGoalsByTiming.upcoming.length +
              galloGoalsByTiming.scheduled.length,
            detail: "Scheduled or upcoming",
          },
          {
            label: "Archived",
            view: "archived" as const,
            value: galloGoalsByTiming.archived.filter(
              (goal) => goal.lifeCycleStatus !== "disabled",
            ).length,
            detail: "Past Axis goals",
          },
        ]
      : [
          {
            label: "Current",
            value: counts.current,
            detail: "Goals in progress",
          },
          {
            label: "Upcoming",
            value: counts.upcoming,
            detail: "Scheduled to begin",
          },
          {
            label: "Archived",
            value: counts.archived,
            detail: "Completed periods",
          },
        ];

  if (isSupplier) {
    return (
      <main className="goal-manager-page goal-manager-page--partner">
        <header className="goal-manager-header">
          <div className="goal-manager-header__identity">
            <span className="goal-manager-header__mark" aria-hidden="true">
              <HandshakeOutlinedIcon />
            </span>
            <div>
              <span className="goal-manager-eyebrow">Partner network</span>
              <h1>Partner goals</h1>
              <p>
                Follow distributor programs connected to your company and review
                the displays submitted against them.
              </p>
            </div>
          </div>
        </header>

        <section className="goal-manager-panel">
          <SupplierGoalsLayout companyId={companyId} />
        </section>
      </main>
    );
  }

  return (
    <main className="goal-manager-page">
      <header className="goal-manager-header">
        <div className="goal-manager-header__identity">
          <span
            className={`goal-manager-header__mark ${
              source === "gallo" ? "goal-manager-header__mark--wine" : ""
            }`}
            aria-hidden="true"
          >
            {source === "gallo" ? (
              <span className="goal-manager-header__wine-icons">
                <WineBarRoundedIcon />
                <LiquorRoundedIcon />
              </span>
            ) : (
              <TrackChangesOutlinedIcon />
            )}
          </span>
          <div>
            <span className="goal-manager-eyebrow">
              {source === "gallo" ? "Gallo Axis integration" : "Management"}
            </span>
            <h1>{source === "gallo" ? "Gallo Axis goals" : "Goals manager"}</h1>
            <p>
              {source === "gallo"
                ? "Review the Gallo programs already available through your integration."
                : "Create, assign, and monitor display goals across your company."}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`goal-manager-create ${
            source === "gallo" ? "goal-manager-create--wine" : ""
          }`}
          onClick={() => setCreateOpen(true)}
        >
          {source === "gallo" ? <LiquorRoundedIcon /> : <AddTaskRoundedIcon />}
          {source === "gallo" ? "Import goal" : "Create goal"}
        </button>
      </header>

      {galloEnabled && (
        <section
          className="goal-manager-source"
          aria-label="Goal source selector"
        >
          <div className="goal-manager-source__intro">
            <span>Goal source</span>
            <p>
              Switch between goals created by your company and programs supplied
              through Gallo Axis.
            </p>
          </div>

          <div
            className="goal-manager-source__options"
            role="tablist"
            aria-label="Choose goal source"
          >
            <button
              id="goal-source-tab-company"
              type="button"
              role="tab"
              aria-selected={source === "company"}
              aria-controls="goal-source-panel-company"
              className={source === "company" ? "is-active" : ""}
              onClick={() => setSource("company")}
            >
              <span className="goal-manager-source__icon" aria-hidden="true">
                <TrackChangesOutlinedIcon />
              </span>
              <span className="goal-manager-source__copy">
                <strong>Company goals</strong>
                <small>Created and assigned by your team</small>
              </span>
            </button>

            <button
              id="goal-source-tab-gallo"
              type="button"
              role="tab"
              aria-selected={source === "gallo"}
              aria-controls="goal-source-panel-gallo"
              className={source === "gallo" ? "is-active" : ""}
              onClick={() => setSource("gallo")}
            >
              <span
                className="goal-manager-source__icon goal-manager-source__icon--wine"
                aria-hidden="true"
              >
                <WineBarRoundedIcon />
                <LiquorRoundedIcon />
              </span>
              <span className="goal-manager-source__copy">
                <strong>Gallo Axis</strong>
                <small>Integrated supplier programs</small>
              </span>
              <span className="goal-manager-source__badge">Integrated</span>
            </button>
          </div>
        </section>
      )}

      <section
        className={`goal-manager-summary ${
          source === "gallo" ? "goal-manager-summary--interactive" : ""
        }`}
        aria-label={source === "gallo" ? "Gallo goal views" : "Goal summary"}
        role={source === "gallo" ? "tablist" : undefined}
      >
        {summaryItems.map((item) =>
          source === "gallo" && "view" in item ? (
            <button
              key={item.label}
              id={`gallo-view-tab-${item.view}`}
              type="button"
              role="tab"
              aria-selected={galloView === item.view}
              aria-controls="gallo-goal-view-panel"
              className={galloView === item.view ? "is-active" : ""}
              onClick={() => setGalloView(item.view)}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </button>
          ) : (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ),
        )}
      </section>

      <section className="goal-manager-panel" data-goal-source={source}>
        <div className="goal-manager-content">
          <AllGoalsLayout
            companyId={companyId}
            source={source}
            galloEnabled={galloEnabled}
            galloView={galloView}
            onGalloViewChange={setGalloView}
          />
        </div>
      </section>

      <CreateGoalsLayout
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        galloEnabled={galloEnabled}
        initialSource={source}
      />
    </main>
  );
};

export default GoalManagerLayout;
