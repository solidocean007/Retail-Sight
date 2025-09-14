// GoalManager.tsx
import {
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Typography,
} from "@mui/material";
import CreateCompanyGoalView from "./CreateCompanyGoalView";
import AllGoalsLayout from "./AllGoalsLayout";
import React, { useEffect, useState } from "react";
import { useIntegrations } from "../../hooks/useIntegrations";
import GalloIntegration from "./GalloIntegration";
import CreateCompanyGoalViewCopy from "./CreateCompanyGoalViewCopy";
const CreateGalloGoalView = React.lazy(() => import("./CreateGalloGoalView"));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ backgroundColor: "var(--dashboard-card)" }}>{children}</Box>
      )}
    </div>
  );
}

interface GoalManagerProps {
  companyId: string | undefined;
}

const GoalManager: React.FC<GoalManagerProps> = ({ companyId }) => {
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const tabs = [
    {
      key: "all",
      label: "All Goals",
      panel: <AllGoalsLayout companyId={companyId} />,
    },
    ...(galloEnabled
      ? [
          {
            key: "gallo",
            label: "Gallo Program Import",
            panel: (
              <React.Suspense
                fallback={<div style={{ padding: 8 }}>Loading…</div>}
              >
                <CreateGalloGoalView setValue={setValue} />
              </React.Suspense>
            ),
          },
          {
            key: "galloIntegation",
            label: "Gallo Integration",
            panel: (
              <React.Suspense
                fallback={<div style={{ padding: 8 }}>Loading…</div>}
              >
                <GalloIntegration setValue={setValue} />
              </React.Suspense>
            ),
          },
        ]
      : []),
    {
      key: "company",
      label: "Company Goal Creation",
      panel: <CreateCompanyGoalView />,
    },
  ];

  useEffect(() => {
    if (value >= tabs.length) setValue(0);
  }, [tabs.length, value]);

  return (
    <div>
      <Typography>All Goals Manager</Typography>
      {/* <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 0 }}> */}
      <Box sx={{ borderBottom: 1, mb: 0 }}>
        {isMobile ? (
          <Select
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            fullWidth
          >
            {tabs.map((t, i) => (
              <MenuItem key={t.key} value={i}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <Tabs
            value={value}
            onChange={(_, i) => setValue(i)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              // borderBottom: "1px solid #ccc", // Separation under tabs
              "& .MuiTab-root": {
                borderTopLeftRadius: "12px",
                borderTopRightRadius: "12px",
                textTransform: "none", // prevent all caps
                padding: "8px 16px",
                marginRight: "8px",
                marginBottom: "0px",
                backgroundColor: "var(--tab-background)",
                "&.Mui-selected": {
                  backgroundColor: "var(--tab-background-selected)",
                  color: "var(--color-selected)",
                  border: "1px solid #ccc",
                  borderBottom: "none", // remove overlap on active tab
                },
              },
            }}
          >
            {tabs.map((t, i) => (
              <Tab
                key={t.key}
                label={t.label}
                id={`simple-tab-${i}`}
                aria-controls={`simple-tabpanel-${i}`}
              />
            ))}
          </Tabs>
        )}
      </Box>
      <div>
        {tabs.map((t, i) => (
          <TabPanel key={t.key} value={value} index={i}>
            {t.panel}
          </TabPanel>
        ))}
      </div>
    </div>
  );
};

export default GoalManager;
