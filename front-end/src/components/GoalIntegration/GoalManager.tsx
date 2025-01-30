// GoalIntegrationLayout.tsx
import { useState } from "react";
import { Box, Container, Tabs, Tab } from "@mui/material";
import CreateGalloGoalView from "./CreateGalloGoalView";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";
import CreateCompanyGoalView from "./CreateCompanyGoalView";
import AllGoalsLayout from "./AllGoalsLayout";

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const GoalManager: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={value} onChange={handleChange} aria-label="dashboard tabs">
          <Tab label="All Goals" {...a11yProps(0)} />
          <Tab label="Gallo Program Import" {...a11yProps(1)} />
          <Tab label="Company Goal Creation" {...a11yProps(2)} />
          {/* Add more tabs as necessary */}
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AllGoalsLayout />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CreateGalloGoalView setValue={setValue} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <CreateCompanyGoalView />
      </TabPanel>

      {/* Add more TabPanels as necessary */}
    </Container>
  );
};

export default GoalManager;
