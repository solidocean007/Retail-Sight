import { Box, Container, Tab, Tabs } from "@mui/material"
import { useState } from "react";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import AllGalloGoalsView from "./AllGalloGoalsView";

const AllGoalsLayout = () => {
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
    <Container>
       <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="all-goals-view tabs"
        >
          <Tab label="Company Goals" {...a11yProps(0)} />
          <Tab label="Gallo Programs & Goals" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <Box className="table-container">
          <AllCompanyGoalsView  /> 
        </Box>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Box className="table-container">
          <AllGalloGoalsView  /> 
        </Box>
      </TabPanel>
    </Container>
  )
}

export default AllGoalsLayout;