// components/Goals/CreateGoalsLayout.tsx
import React, { useEffect, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import CreateCompanyGoalView from "./CreateCompanyGoalView";
import GalloGoalImporter from "./GalloIntegration/GalloGoalImporter";

import "./allGoalsLayout.css"; // reuse same CSS
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";

type GoalCreateSource = "company" | "gallo";

interface CreateGoalsLayoutProps {
  companyId: string | undefined;
}

const CreateGoalsLayout: React.FC<CreateGoalsLayoutProps> = ({
  companyId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { isEnabled, loading } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  console.log("Gallo Integration Enabled:", galloEnabled); // false??
  const [source, setSource] = useState<GoalCreateSource>("company");


  return (
    <section className="all-goals">
      {/* ================= SOURCE SWITCHER ================= */}
      <div className="goal-source-switcher">
        <button
          className={`source-btn ${source === "company" ? "active" : ""}`}
          onClick={() => setSource("company")}
        >
          Create Company Goal
        </button>

        {galloEnabled && (
          <button
            className={`source-btn external ${
              source === "gallo" ? "active" : ""
            }`}
            onClick={() => setSource("gallo")}
          >
            Create Gallo Axis Goal
            <span className="external-badge">External</span>
          </button>
        )}
      </div>

      {/* ================= ACTIVE CREATOR ================= */}
      <div className={`goals-view ${source}`}>
        {source === "company" && <CreateCompanyGoalView />}

        {source === "gallo" && galloEnabled && (
          <GalloGoalImporter setValue={() => {}} />
        )}
      </div>
    </section>
  );
};

export default CreateGoalsLayout;
