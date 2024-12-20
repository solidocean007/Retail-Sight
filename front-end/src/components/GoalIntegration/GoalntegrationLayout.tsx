// GoalIntegrationLayout.tsx
import { useState, useEffect } from "react";
import { Box, Container, Typography, Tabs, Tab } from "@mui/material";
import IntegrationView from "../IntegrationView";
import ApiView from "../ApiView";
import CreateGalloGoalView from "./CreateGalloGoalView";
import AllGoalsView from "./AllProgramsView";
import { useSelector } from "react-redux";
import { selectUser } from "../../Slices/userSlice";

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

const GoalIntegrationLayout: React.FC = () => {
  const [value, setValue] = useState(0);
  const user = useSelector(selectUser);
  const companyId = user?.companyId;

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={value} onChange={handleChange} aria-label="dashboard tabs">
          <Tab label="Program Manager" {...a11yProps(0)} />
          <Tab label="Program Import" {...a11yProps(1)} />
          <Tab label="External Integration" {...a11yProps(2)} />
          <Tab label="Internal API Management" {...a11yProps(3)} />
          {/* Add more tabs as necessary */}
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <AllGoalsView companyId={companyId} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CreateGalloGoalView setValue={setValue} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <IntegrationView /> {/* Your IntegrationView component */}
      </TabPanel>
      <TabPanel value={value} index={3}>
        <ApiView /> {/* Your ApiView component */}
      </TabPanel>

      {/* Add more TabPanels as necessary */}
    </Container>
  );
};

export default GoalIntegrationLayout;
