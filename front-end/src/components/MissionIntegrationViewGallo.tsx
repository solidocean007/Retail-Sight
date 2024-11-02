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
import { GoalType, ProgramType } from "../utils/types";
import fetchExternalApiKey from "./ApiKeyLogic/fetchExternalApiKey";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

type ExternalApiKey = {
  name: string;
  key: string;
};

type FetchResponseType = Record<string, any>[];

const MissionIntegrationViewGallo = () => {
  // const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [externalApiName, setExternalApiName] = useState("");
  const [storedExternalApiKeys, setStoredExternalApiKeys] = useState<
    ExternalApiKey[]
  >([]);
  const [method, setMethod] = useState("GET");
  const [queryParams, setQueryParams] = useState([{ key: "", value: "" }]);
  const [bodyData, setBodyData] = useState("");
  const [fetchResponse, setFetchResponse] = useState<FetchResponseType | null>(null);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newMission, setNewMission] = useState(null); // State to save new missions

  const [startDate, setStartDate] = useState<Date | null>();
  const [programs, setPrograms] = useState<ProgramType[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [goals, setGoals] = useState<GoalType[]>([]);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const baseUrl = "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";

  const handleDateChange = (newDate: Date | null) => {
    setStartDate(newDate);
  };

  // Example function to convert Date to Unix timestamp
  const getUnixTimestamp = (date: Date | null | undefined): string =>
    date ? Math.floor(date.getTime() / 1000).toString() : "";

  const handleFetchData = async (
    type: "programs" | "goals",
    additionalParams?: { [key: string]: string }
  ) => {
    if (!companyId) return;
    const externalApiKey = await fetchExternalApiKey(companyId, "galloApiKey");
    setApiKey(externalApiKey);
    const endpoint = type === "programs" ? "programs" : "goals";
    const url = `${baseUrl}/${endpoint}`;

    const requestOptions = {
      baseUrl: baseUrl,
      method: method,
      headers: apiKey
        ? { "x-api-key": apiKey, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" }, // Ensure correct headers
      body: method !== "GET" && bodyData ? JSON.parse(bodyData) : null,
    };

    console.log("Request options:", requestOptions); // Log the request options to check

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json", // Ensure the header is set
          },
          body: JSON.stringify(requestOptions), // Stringify the request body
        }
      );

      const data = await response.json();
      console.log("data: ", data);
      setFetchResponse(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch(
        `https://api.example.com/{distributorName}/programs?startDate=${startDate}`
      );
      const data = await response.json();
      setPrograms(data); // Assume response data is an array of programs
    } catch (error) {
      console.error("Error fetching programs:", error);
    }
  };

  const fetchGoals = async (programId: string) => {
    try {
      const response = await fetch(
        `https://api.example.com/{distributorName}/goals?programId=${programId}`
      );
      const data = await response.json();
      setGoals(data); // Assume response data is an array of goals
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedPrograms((prevSelected) =>
      prevSelected.includes(programId)
        ? prevSelected.filter((id) => id !== programId)
        : [...prevSelected, programId]
    );
    fetchGoals(programId); // Fetch goals related to the selected program
  };

  useEffect(() => {
    // this needs to be set up hardcoded for now as
    localStorage.setItem("baseUrl", baseUrl);
  }, [baseUrl]);

  const buildUrl = () => {
    let url =
      baseUrl.endsWith("?") || baseUrl.includes("?") ? baseUrl : `${baseUrl}?`;

    queryParams.forEach((param) => {
      if (param.key.trim() && param.value.trim()) {
        url += `${encodeURIComponent(param.key)}=${encodeURIComponent(
          param.value
        )}&`;
      }
    });

    return url.slice(0, -1); // Remove the trailing "&"
  };

  const handleCheckboxChange = (missionId: string) => {
    setSelectedMissions((prevSelected) =>
      prevSelected.includes(missionId)
        ? prevSelected.filter((id) => id !== missionId)
        : [...prevSelected, missionId]
    );
  };

  const renderJsonTable = (data: unknown) => {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);

      return (
        <TableContainer>
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
                      checked={selectedMissions.includes(item.id)}
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
        <Typography variant="h4">Mission Integration View</Typography>

        {/* Start Date Input */}
        {/* Date Picker for Start Date */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={handleDateChange}
            slotProps={{
              textField: { fullWidth: true, margin: "normal" },
            }}
          />
        </LocalizationProvider>

        <Button
          onClick={() => {
            const unixTimestamp = startDate
              ? Math.floor(startDate.getTime() / 1000)
              : "";
            console.log("Selected Start Date (Unix Timestamp):", unixTimestamp);
          }}
          variant="contained"
          color="primary"
        >
          Fetch Programs
        </Button>

        {/* Fetch Programs Button */}
        <Button onClick={fetchPrograms} variant="contained" color="primary">
          Fetch Programs
        </Button>

        <Button
          onClick={() =>
            handleFetchData("programs", {
              startDate: getUnixTimestamp(startDate),
            })
          }
        >
          {" "}
          // Type 'Date | null | undefined' is not assignable to type 'string'.
          {/* Type 'undefined' is not assignable to type 'string'. */}
          Fetch Programs
        </Button>
        {selectedPrograms.map((programId) => (
          <Button
            key={programId}
            onClick={() => handleFetchData("goals", { programId })}
          >
            Fetch Goals for Program {programId}
          </Button>
        ))}

        {/* Programs Table */}
        {programs.length > 0 && (
          <TableContainer>
            <Typography variant="h6">Programs</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>Program Title</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.programId}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPrograms.includes(program.programId)}
                        onChange={() => handleProgramSelect(program.programId)}
                      />
                    </TableCell>
                    <TableCell>{program.programTitle}</TableCell>
                    <TableCell>{program.startDate}</TableCell>
                    <TableCell>{program.endDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Goals Table */}
        {goals.length > 0 && (
          <TableContainer>
            <Typography variant="h6">Goals for Selected Programs</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Goal</TableCell>
                  <TableCell>Goal Metric</TableCell>
                  <TableCell>Goal Value Min</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {goals.map((goal) => (
                  <TableRow key={goal.goalId}>
                    <TableCell>{goal.goal}</TableCell>
                    <TableCell>{goal.goalMetric}</TableCell>
                    <TableCell>{goal.goalValueMin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
};

export default MissionIntegrationViewGallo;
