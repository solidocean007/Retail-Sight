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
import { auth } from "../utils/firebase";
import { getAuth } from "@firebase/auth";

type ExternalApiKey = {
  name: string;
  key: string;
};

const MissionIntegrationView = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [externalApiName, setExternalApiName] = useState("");
  const [storedExternalApiKeys, setStoredExternalApiKeys] = useState<ExternalApiKey[]>([]);
  const [method, setMethod] = useState("GET");
  const [queryParams, setQueryParams] = useState([{ key: "", value: "" }]);
  const [bodyData, setBodyData] = useState("");
  const [fetchResponse, setFetchResponse] = useState(null);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newMission, setNewMission] = useState(null); // State to save new missions

  const functions = getFunctions();

  useEffect(() => {
    localStorage.setItem("baseUrl", baseUrl);
  }, [baseUrl]);

  const handleAddQueryParam = () => {
    setQueryParams([...queryParams, { key: "", value: "" }]);
  };

  const handleQueryParamChange = (
    index: number,
    keyOrValue: string,
    newValue: string
  ) => {
    const updatedParams = [...queryParams];
    updatedParams[index][keyOrValue] = newValue;
    setQueryParams(updatedParams);
  };

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

  const handleFetchData = async () => {
    const requestOptions = {
      baseUrl: baseUrl.trim(),
      method: method,
      headers: apiKey
        ? { "x-api-key": apiKey, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" },
      body: method !== "GET" && bodyData ? JSON.parse(bodyData) : null,
    };

    try {
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/fetchData",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestOptions),
        }
      );

      const data = await response.json();
      setFetchResponse(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
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
        <Typography variant="h4">Mission & Integration Management</Typography>
        <Typography variant="h5">
          Requesting information from external sources.  Assign external values 
          or keys to missions so that they can be stored as missions for users
           to associate their posts to.
        </Typography>

        {/* Base URL */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Base URL</InputLabel>
          <Select value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}>
            <MenuItem value="https://example.com/api1">API 1</MenuItem>
            <MenuItem value="https://example.com/api2">API 2</MenuItem>
            {/* Add logic to populate this dynamically */}
          </Select>
        </FormControl>

        {/* Method Selector */}
        <FormControl fullWidth margin="normal">
          <InputLabel>HTTP Method</InputLabel>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <MenuItem value="GET">GET</MenuItem>
            <MenuItem value="POST">POST</MenuItem>
            <MenuItem value="PUT">PUT</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
          </Select>
        </FormControl>

        {/* API Key */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Select External API Key</InputLabel>
          <Select value={apiKey} onChange={(e) => setApiKey(e.target.value)}>
            {storedExternalApiKeys.map((api) => (
              <MenuItem key={api.key} value={api.key}>
                {api.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button onClick={() => setIsApiKeyModalOpen(true)}>
          Add New External Key
        </Button>

        {/* Query Parameters */}
        {queryParams.map((param, index) => (
          <Box key={index} display="flex">
            <TextField
              label="Key"
              value={param.key}
              onChange={(e) =>
                handleQueryParamChange(index, "key", e.target.value)
              }
              margin="normal"
            />
            <TextField
              label="Value"
              value={param.value}
              onChange={(e) =>
                handleQueryParamChange(index, "value", e.target.value)
              }
              margin="normal"
            />
          </Box>
        ))}
        <Button onClick={handleAddQueryParam}>Add Query Parameter</Button>

        {/* Body Data Input (only visible if POST or PUT is selected) */}
        {(method === "POST" || method === "PUT") && (
          <TextField
            label="Request Body (JSON)"
            value={bodyData}
            onChange={(e) => setBodyData(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={4}
            helperText="Enter the JSON data for the request body."
          />
        )}

        {/* Fetch Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleFetchData}
          style={{ marginTop: "20px" }}
        >
          Fetch Data
        </Button>

        {/* Display Fetch Response */}
        {fetchResponse && (
          <Box>
            <Typography variant="h6">Fetch Response:</Typography>
            {renderJsonTable(fetchResponse)}
          </Box>
        )}
      </Box>

      <Modal open={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)}>
        <Box>
          <Typography>Add New API Key</Typography>
          <Divider />
          <TextField label="API Key Name" fullWidth margin="normal" />
          <TextField label="API Key" fullWidth margin="normal" />
          <Button>Add API Key</Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default MissionIntegrationView;
