import AllCompanyGoalsView from "./AllCompanyGoalsView";
import AllGalloGoalsView from "./AllGalloGoalsView";

import "./allGoalsLayout.css";

export type GoalSource = "company" | "gallo";

type AllGoalsLayoutProps = {
  companyId?: string;
  source: GoalSource;
  galloEnabled: boolean;
};

const AllGoalsLayout = ({
  companyId,
  source,
  galloEnabled,
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
        galloEnabled && <AllGalloGoalsView />
      )}
    </section>
  );
};

export default AllGoalsLayout;
