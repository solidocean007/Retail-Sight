import {
  Box,
  // Container,
  Tab,
  Tabs,
  Select,
  MenuItem,
  useMediaQuery,
  SelectChangeEvent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import "./allGoalsLayout.css";
import { useSelector } from "react-redux";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { CompanyGoalWithIdType } from "../../utils/types";
import AllGalloGoalsView from "./AllGalloGoalsView";
import { selectAllGalloGoals } from "../../Slices/galloGoalsSlice";
import { useIntegrations } from "../../hooks/useIntegrations";

export interface GoalDuplicateReport {
  goalId: string;
  duplicatePostIds: string[];
}

export function findDuplicateSubmissions(
  goals: CompanyGoalWithIdType[]
): GoalDuplicateReport[] {
  return goals
    .map((goal) => {
      const counts = (goal.submittedPosts || []).reduce<Record<string, number>>(
        (acc, submission) => {
          acc[submission.postId] = (acc[submission.postId] || 0) + 1;
          return acc;
        },
        {}
      );

      const duplicates = Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([postId]) => postId);

      return duplicates.length > 0
        ? { goalId: goal.id, duplicatePostIds: duplicates }
        : null;
    })
    .filter((report): report is GoalDuplicateReport => report !== null);
}

interface AllGoalsLayoutProps {
  companyId: string | undefined;
}

const AllGoalsLayout: React.FC<AllGoalsLayoutProps> = ({ companyId }) => {
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const [value, setValue] = useState(0);
  const theme = useTheme(); // Correct usage of `useTheme`
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Accessing breakpoints safely
  const companyGoals = useSelector(selectAllCompanyGoals);
  console.log

  const tabs = useMemo(
    () => [
      {
        key: "company",
        label: "Company Goals",
        panel: <AllCompanyGoalsView companyId={companyId} />,
      },
      ...(galloEnabled
        ? [
            {
              key: "gallo",
              label: "Gallo Programs & Goals",
              panel: <AllGalloGoalsView />,
            },
          ]
        : []),
    ],
    [galloEnabled, companyId]
  );

  useEffect(() => {
    if (value >= tabs.length) setValue(0);
  }, [tabs.length, value]);

  // Compute duplicate reports once whenever goals change
  const duplicateReports: GoalDuplicateReport[] = useMemo(
    () => findDuplicateSubmissions(companyGoals),
    [companyGoals]
  );

  // Optionally log to console
  useMemo(() => {
    if (duplicateReports.length) {
      console.warn("Goals with duplicate submissions:", duplicateReports);
    }
  }, [duplicateReports]);

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
        {value === index && <Box sx={{ p: 8 }}>{children}</Box>}
      </div>
    );
  }

  function a11yProps(index: number) {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleSelectChange = (event: SelectChangeEvent<number>) => {
    setValue(Number(event.target.value));
  };

  return (
    <div className="all-goals-container" style={{ padding: "5px" }}>
      <Box className="tabs-container">
        {isMobile ? (
          <Select
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            fullWidth
            displayEmpty
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

      {tabs.map((t, i) => (
        <div
          role="tabpanel"
          hidden={value !== i}
          id={`simple-tabpanel-${i}`}
          key={t.key}
        >
          {value === i && <Box sx={{ p: 1 }}>{t.panel}</Box>}
        </div>
      ))}
    </div>
  );
};

export default AllGoalsLayout;
