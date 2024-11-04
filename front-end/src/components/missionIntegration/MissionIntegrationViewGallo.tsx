// MissionIntegrationView.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Checkbox,
  TableHead,
  Modal,
  Divider,
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";
// import { auth } from "../utils/firebase";
// import { getAuth } from "@firebase/auth";
import { GoalType, ProgramType } from "../../utils/types";
import fetchExternalApiKey from "../ApiKeyLogic/fetchExternalApiKey";
import { useSelector } from "react-redux";
import { RootState } from "../../utils/store";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import DateSelector from "./DateSelector";
import ProgramTable from "./ProgramTable";
import GoalTable from "./GoalTable";

type ExternalApiKey = {
  name: string;
  key: string;
};

type FetchResponseType = Record<string, any>[];

const MissionIntegrationViewGallo = () => {
  const [apiKey, setApiKey] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [goals, setGoals] = useState<GoalType[]>([]);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const baseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

  const handleDateChange = (newDate: Dayjs | null) => {
    setStartDate(newDate); // Ensure newDate is a Dayjs object, as required
  };

  // Example function to convert Date to Unix timestamp
  const getUnixTimestamp = (date: Date | Dayjs | null | undefined): string => {
    // Check if date is a Day.js instance and return the Unix timestamp
    if (date && dayjs.isDayjs(date)) {
      return date.unix().toString(); // Gets the Unix timestamp in seconds
    } else if (date instanceof Date && !isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000).toString();
    } else {
      console.warn("Invalid date provided:", date);
      return "";
    }
  };

  const handleFetchData = async (
    type: "programs" | "goals",
    additionalParams?: { [key: string]: string }
  ) => {
    if (!companyId) return;

    const externalApiKey = await fetchExternalApiKey(companyId, "galloApiKey");
    setApiKey(externalApiKey);

    const endpoint = `healy/${type}`;
    const startDateUnix = getUnixTimestamp(startDate);
    const url = `${baseUrl}/${endpoint}?startDate=${startDateUnix}`;

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { "x-api-key": apiKey }),
      },
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestOptions, baseUrl: url }),
        }
      );

      const data = await response.json();
      if (type === "programs") {
        setPrograms(data); // Assuming data contains program list
      } else {
        setGoals(data); // Assuming data contains goals list
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // const fetchPrograms = async () => {
  //   try {
  //     const response = await fetch(
  //       `https://api.example.com/healy/programs?startDate=${startDate}`
  //     );
  //     const data = await response.json();
  //     setPrograms(data); // Assume response data is an array of programs
  //   } catch (error) {
  //     console.error("Error fetching programs:", error);
  //   }
  // };

  // const fetchGoals = async (programId: string) => {
  //   try {
  //     const response = await fetch(
  //       `https://api.example.com/{distributorName}/goals?programId=${programId}`
  //     );
  //     const data = await response.json();
  //     setGoals(data); // Assume response data is an array of goals
  //   } catch (error) {
  //     console.error("Error fetching goals:", error);
  //   }
  // };

  const handleProgramSelect = (programId: string) => {
    setSelectedPrograms((prevSelected) =>
      prevSelected.includes(programId)
        ? prevSelected.filter((id) => id !== programId)
        : [...prevSelected, programId]
    );
    handleFetchData("goals", { programId }); // Fetch goals related to the selected program
  };

  // useEffect(() => {
  //   // this needs to be set up hardcoded for now as
  //   localStorage.setItem("baseUrl", baseUrl);
  // }, [baseUrl]);

  // const buildUrl = () => {
  //   let url =
  //     baseUrl.endsWith("?") || baseUrl.includes("?") ? baseUrl : `${baseUrl}?`;

  //   queryParams.forEach((param) => {
  //     if (param.key.trim() && param.value.trim()) {
  //       url += `${encodeURIComponent(param.key)}=${encodeURIComponent(
  //         param.value
  //       )}&`;
  //     }
  //   });

  //   return url.slice(0, -1); // Remove the trailing "&"
  // };

  const handleCheckboxChange = (missionId: string) => {
    setSelectedPrograms((prevSelected) => 
      prevSelected.includes(missionId)
        ? prevSelected.filter((id) => id !== missionId)
        : [...prevSelected, missionId]
    );
  };
  console.log(selectedPrograms);
  const renderJsonTable = (data: unknown) => {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);

      return (
        <TableContainer>
          Select a program
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Select</TableCell>
                {headers.map((header) => (
                  <TableCell key={header}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPrograms.includes(item.id)}
                      onChange={() => handleCheckboxChange(item.id)}
                    />
                  </TableCell>
                  {headers.map((header) => (
                    <TableCell key={`${item.id}-${header}`}>
                      {item[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    return <span>No data available</span>;
  };

  return (
    <Container>
      <Box>
        <DateSelector
          startDate={startDate}
          onDateChange={handleDateChange}
          onFetchPrograms={() =>
            handleFetchData("programs", { startDate: getUnixTimestamp(startDate) })
          }
        />
        <ProgramTable
          programs={programs}
          selectedPrograms={selectedPrograms}
          onSelectProgram={handleProgramSelect}
          onFetchGoals={handleFetchData}
        />
        {goals.length > 0 && <GoalTable goals={goals} />}
      </Box>
    </Container>
  );
};

export default MissionIntegrationViewGallo;
