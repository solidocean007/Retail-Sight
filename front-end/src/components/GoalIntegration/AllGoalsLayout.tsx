// components/Goals/AllGoalsLayout.tsx
import React, { useEffect, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useIntegrations } from "../../hooks/useIntegrations";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import AllGalloGoalsView from "./AllGalloGoalsView";

import "./allGoalsLayout.css";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

type GoalSource = "company" | "gallo";

interface AllGoalsLayoutProps {
  companyId: string | undefined;
}

const AllGoalsLayout: React.FC<AllGoalsLayoutProps> = ({
  companyId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const user = useSelector(selectUser);
  const { isEnabled, loading } = useIntegrations();

  const galloEnabled = isEnabled("gallo");
  const canSeeIntegrations =
    user?.role === "admin" ||
    user?.role === "super-admin" ||
    user?.role === "developer";

  const [source, setSource] = useState<GoalSource>("company");

  return (
    <section className="all-goals">
      {/* ================= SOURCE SWITCHER ================= */}
      <div className="goal-source-switcher">
        <button
          className={`source-btn ${source === "company" ? "active" : ""}`}
          onClick={() => setSource("company")}
        >
          Current Company Goals
        </button>

        {galloEnabled && (
          <button
            className={`source-btn external ${
              source === "gallo" ? "active" : ""
            }`}
            onClick={() => setSource("gallo")}
          >
            Current Gallo Axis Goals
            <span className="external-badge">External</span>
          </button>
        )}
      </div>

      {/* ================= ACTIVE VIEW ================= */}
      <div className={`goals-view ${source}`}>
        {source === "company" && <AllCompanyGoalsView companyId={companyId} />}

        {source === "gallo" && galloEnabled && <AllGalloGoalsView />}
      </div>
    </section>
  );
};

export default AllGoalsLayout;
