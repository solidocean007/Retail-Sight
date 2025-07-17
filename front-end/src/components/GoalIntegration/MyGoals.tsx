import React, { useState } from "react";
import { Tabs, Tab, Box, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MyCompanyGoals from "./MyCompanyGoals";
import "./myGoals.css";
import MyGalloGoals from "./MyGalloGoals";

const MyGoals = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box className="my-goals-container">
      <Typography
        variant={isMobile ? "h5" : "h3"}
        className="my-goals-title"
        gutterBottom
      >
        My Goals
      </Typography>

      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant={isMobile ? "fullWidth" : "standard"}
        centered={!isMobile}
        className="goals-tabs"
      >
        <Tab label="Company Goals" />
        <Tab label="Gallo Programs" />
      </Tabs>

      <Box className="goals-content">
        {tabIndex === 0 && <MyCompanyGoals />}
        {tabIndex === 1 && <MyGalloGoals />}
      </Box>
    </Box>
  );
};

export default MyGoals;
