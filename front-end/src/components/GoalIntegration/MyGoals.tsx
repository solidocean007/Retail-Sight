import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Box, CircularProgress, Tab, Tabs } from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import { useSelector } from "react-redux";

import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";
import { RootState } from "../../utils/store";
import MyCompanyGoals from "./MyCompanyGoals";

import "./myGoals.css";

const MyGalloGoals = lazy(() => import("./MyGalloGoals"));

type GoalSource = "company" | "gallo";

const MyGoals = () => {
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const { isEnabled, loading: integrationsLoading } =
    useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const [activeSource, setActiveSource] = useState<GoalSource>("company");

  const sources = useMemo(
    () => [
      {
        key: "company" as const,
        label: "Company goals",
        description: "Goals assigned and tracked by your company.",
        icon: <BusinessOutlinedIcon />,
      },
      ...(galloEnabled
        ? [
            {
              key: "gallo" as const,
              label: "Gallo goals",
              description: "Programs synchronized from Gallo Axis.",
              icon: <AutoAwesomeOutlinedIcon />,
            },
          ]
        : []),
    ],
    [galloEnabled],
  );

  useEffect(() => {
    if (!galloEnabled && activeSource === "gallo") {
      setActiveSource("company");
    }
  }, [activeSource, galloEnabled]);

  const activeDescription =
    sources.find((source) => source.key === activeSource)?.description ??
    sources[0].description;

  return (
    <main className="my-goals-page">
      <header className="my-goals-page__header">
        <div className="my-goals-page__title-group">
          <span className="my-goals-page__mark" aria-hidden="true">
            <TrackChangesOutlinedIcon />
          </span>
          <div>
            <span className="my-goals-page__eyebrow">Performance</span>
            <h1>My goals</h1>
            <p>Stay focused on active work and see what is coming next.</p>
          </div>
        </div>
        {integrationsLoading && (
          <span className="my-goals-page__integration-status">
            <CircularProgress size={13} />
            Checking integrations
          </span>
        )}
      </header>

      <section className="goal-source-panel" aria-label="Goal source">
        <Tabs
          value={activeSource}
          onChange={(_, value: GoalSource) => setActiveSource(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          className="goal-source-tabs"
          aria-label="Choose a goal source"
        >
          {sources.map((source) => (
            <Tab
              key={source.key}
              value={source.key}
              icon={source.icon}
              iconPosition="start"
              label={source.label}
              className="goal-source-tab"
            />
          ))}
        </Tabs>
        <p className="goal-source-panel__description">{activeDescription}</p>
      </section>

      <Box className="goals-content">
        {activeSource === "company" && <MyCompanyGoals />}
        {galloEnabled && activeSource === "gallo" && (
          <Suspense
            fallback={
              <div className="my-goals-loading" role="status">
                <CircularProgress size={28} />
                <span>Loading your Gallo goals…</span>
              </div>
            }
          >
            <MyGalloGoals />
          </Suspense>
        )}
      </Box>
    </main>
  );
};

export default MyGoals;
