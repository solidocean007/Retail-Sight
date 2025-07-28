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
import { useMemo, useState } from "react";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import "./allGoalsLayout.css";
import { useSelector } from "react-redux";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import { CompanyGoalWithIdType } from "../../utils/types";
import AllGalloGoalsView from "./AllGalloGoalsView";
import { selectAllGalloGoals } from "../../Slices/galloGoalsSlice";

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
  onViewPostModal: (id: string) => void;
}

const AllGoalsLayout: React.FC<AllGoalsLayoutProps> = ({
  companyId,
  onViewPostModal,
}) => {
  const [value, setValue] = useState(0);
  const theme = useTheme(); // Correct usage of `useTheme`
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Accessing breakpoints safely

  const galloGoals = useSelector(selectAllGalloGoals);
  const companyGoals = useSelector(selectAllCompanyGoals);

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
            onChange={handleSelectChange}
            fullWidth
            displayEmpty
          >
            {/* <MenuItem value={0}>Goals View</MenuItem> */}
            <MenuItem value={0}>Company Goals</MenuItem>
            <MenuItem value={1}>Gallo Programs & Goals</MenuItem>
          </Select>
        ) : (
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="All Goals View Tabs"
            className="tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {/* <Tab label="Goals View" {...a11yProps(0)} /> */}
            <Tab label="Company Goals" {...a11yProps(0)} />
            <Tab label="Gallo Programs & Goals" {...a11yProps(1)} />
          </Tabs>
        )}
      </Box>

      {value === 0 && (
        <div className="all-company-goals-view-container">
          <AllCompanyGoalsView
            companyId={companyId}
            onViewPostModal={onViewPostModal}
          />
        </div>
      )}
      {value === 1 && (
        <div className="table-container">
          <AllGalloGoalsView onViewPostModal={onViewPostModal} />
        </div>
      )}
    </div>
  );
};

export default AllGoalsLayout;
