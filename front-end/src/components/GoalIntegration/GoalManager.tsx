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
import CreateGalloGoalView from "./CreateGalloGoalView";
import CreateCompanyGoalView from "./CreateCompanyGoalView";
import AllGoalsLayout from "./AllGoalsLayout";
import { useState } from "react";
import NewCreateCompanyGoalView from "./NewCreateCompanyGoalView";

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
      {value === index && <Box sx={{ backgroundColor: "var(--dashboard-card)", }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface GoalManagerProps {
  companyId: string | undefined;
  onViewPostModal: (postId: string) => void;
}

const GoalManager: React.FC<GoalManagerProps> = ({ companyId, onViewPostModal }) => {
  const [value, setValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

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
            displayEmpty
          >
            <MenuItem value={0}>All Goals</MenuItem>
            <MenuItem value={1}>Gallo Program Import</MenuItem>
            <MenuItem value={2}>Company Goal Creation</MenuItem>
          </Select>
        ) : (
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="dashboard tabs"
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
            <Tab label="All Goals" {...a11yProps(0)} />
            <Tab label="Gallo Program Import" {...a11yProps(1)} />
            <Tab label="Company Goal Creation" {...a11yProps(2)} />
          </Tabs>
        )}
      </Box>
      <div>
        <TabPanel value={value} index={0}>
          <AllGoalsLayout companyId={companyId} onViewPostModal={onViewPostModal} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <CreateGalloGoalView setValue={setValue} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <CreateCompanyGoalView />
        </TabPanel>
      </div>

    </div>
  );
};

export default GoalManager;
