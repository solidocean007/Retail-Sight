import {
  Box,
  Container,
  Tab,
  Tabs,
  Select,
  MenuItem,
  useMediaQuery,
  SelectChangeEvent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import AllCompanyGoalsView from "./AllCompanyGoalsView";
import "./allGoalsLayout.css";
import { useSelector } from "react-redux";
import AdminCompanyGoalsOverview from "./AdminCompanyGoalsOverview";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "@firebase/firestore";
import { db } from "../../utils/firebase";
import path from "path";
import fs from 'fs';
import { CompanyGoalType } from "../../utils/types";

// import allAccountNumbers from "../../allCompanyAccountNumbers.json";
import allAccountNumbers from "../../../allCompanyAccountNumbers.json";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";



const AllGoalsLayout = ({ companyId }: { companyId: string | undefined }) => {
  const [value, setValue] = useState(0);
  const theme = useTheme(); // Correct usage of `useTheme`
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Accessing breakpoints safely

  // const galloGoals = useSelector(selectAllGalloGoals);
  const companyGoals = useSelector(selectAllCompanyGoals);
  console.log(companyGoals);

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

  const handleSelectChange = (event: SelectChangeEvent<number>) => {
    setValue(Number(event.target.value));
  };

  return (
    <div className="all-goals-container">
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
            {/* <MenuItem value={2}>Gallo Programs & Goals</MenuItem> */}
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
            <Tab label="Company Goals" {...a11yProps(1)} />
            {/* <Tab label="Gallo Programs & Goals" {...a11yProps(2)} /> */}
          </Tabs>
        )}
      </Box>
      {/* {value === 0 && (
        <div className="all-company-goals-view-container">
          <AdminCompanyGoalsOverview goals={companyGoals} />
        </div>
      )} */}
      {value === 0 && (
        <div className="all-company-goals-view-container">
          <AllCompanyGoalsView companyId={companyId} />
        </div>
      )}
      {/* {value === 2 && (
        <div className="table-container">
          <AllGalloGoalsView galloGoals={galloGoals} />
        </div>
      )} */}
    </div>
  );
};

export default AllGoalsLayout;
