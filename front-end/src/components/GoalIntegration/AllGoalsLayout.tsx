import { Box, Container, Tab, Tabs } from "@mui/material"
import { useState } from "react";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import AllGalloGoalsView from "./AllGalloGoalsView";
import './allGoalsLayout.css';

const AllGoalsLayout = ({companyId}:{companyId: string}) => {
  const [value, setValue] = useState(0);

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

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
      setValue(newValue);
    };

    return (
      <Container className="all-goals-container">
        <Box className="tabs-container">
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="All Goals View Tabs"
            className="tabs"
          >
            <Tab label="Company Goals" {...a11yProps(0)} />
            <Tab label="Gallo Programs & Goals" {...a11yProps(1)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <div className="table-container">
            <AllCompanyGoalsView companyId={companyId} />
          </div>
        </TabPanel>
        <TabPanel value={value} index={1}>
          <div className="table-container">
            <AllGalloGoalsView />
          </div>
        </TabPanel>
      </Container>
    );
}

export default AllGoalsLayout;