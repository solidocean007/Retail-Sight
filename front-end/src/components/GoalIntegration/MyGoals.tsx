import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Tabs, Tab, Box, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MyCompanyGoals from "./MyCompanyGoals";
import "./myGoals.css";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { useCompanyIntegrations } from "../../hooks/useCompanyIntegrations";

const MyGalloGoals = React.lazy(() => import("./MyGalloGoals"));

interface MyGoalsProps {
  // onViewPostModal: (postId: string) => void;
}

const MyGoals: React.FC<MyGoalsProps> = () => {
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const { isEnabled, loading } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");
  const [tabIndex, setTabIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Build tabs from data to avoid index drift
  const tabs = useMemo(
    () => [
      { key: "company", label: "Company Goals" },
      ...(galloEnabled ? [{ key: "gallo", label: "Gallo Goals" }] : []),
    ],
    [galloEnabled]
  );

  // Clamp index if Gallo becomes disabled while user is on tab 1
  useEffect(() => {
    // If the available tabs change, ensure current index is valid.
    if (tabIndex >= tabs.length) setTabIndex(0);
  }, [tabs.length, tabIndex]);

  // Clamp index if Gallo becomes disabled while user is on tab 1
  useEffect(() => {
    // If the available tabs change, ensure current index is valid.
    if (tabIndex >= tabs.length) setTabIndex(0);
  }, [tabs.length, tabIndex]);

  return (
    <Box className="my-goals-container">
      {/* <Typography
        variant={isMobile ? "h5" : "h3"}
        className="my-goals-title"
        gutterBottom
      >
        My Goals
      </Typography> */}

      <Tabs
        value={tabIndex}
        onChange={(_, i) => setTabIndex(i)}
        variant={isMobile ? "fullWidth" : "standard"}
        centered={!isMobile}
        className="goals-tabs"
      >
        {tabs.map((t) => (
          <Tab key={t.key} label={t.label} />
        ))}
      </Tabs>

      <Box className="goals-content">
        {tabIndex === 0 && <MyCompanyGoals />}
        {galloEnabled && tabIndex === 1 && (
          <Suspense fallback={<div style={{ padding: 8 }}>Loading…</div>}>
            <MyGalloGoals />
          </Suspense>
        )}
      </Box>
    </Box>
  );
};

export default MyGoals;
