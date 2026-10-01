import AllCompanyGoalsView from "./AllCompanyGoalsView";
import AllGalloGoalsView from "./AllGalloGoalsView";

import "./allGoalsLayout.css";

export type GoalSource = "company" | "gallo";
export type GalloGoalView = "current" | "upcoming" | "archived" | "disabled";

type AllGoalsLayoutProps = {
  companyId?: string;
  source: GoalSource;
  galloEnabled: boolean;
  galloView: GalloGoalView;
  onGalloViewChange: (view: GalloGoalView) => void;
};

const AllGoalsLayout = ({
  companyId,
  source,
  galloEnabled,
  galloView,
  onGalloViewChange,
}: AllGoalsLayoutProps) => {
  return (
    <section
      id={`goal-source-panel-${source}`}
      className={`all-goals goals-view ${source}`}
      role="tabpanel"
      aria-labelledby={`goal-source-tab-${source}`}
    >
      {source === "company" ? (
        <AllCompanyGoalsView companyId={companyId} />
      ) : (
        galloEnabled && (
          <AllGalloGoalsView
            view={galloView}
            onViewChange={onGalloViewChange}
          />
        )
      )}
    </section>
  );
};

export default AllGoalsLayout;
