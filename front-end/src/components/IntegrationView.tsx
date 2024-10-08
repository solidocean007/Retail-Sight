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
} from "@mui/material";
import { getFunctions, httpsCallable } from "firebase/functions";

const IntegrationView = () => {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [apiKey, setApiKey] = useState("");
  const [method, setMethod] = useState("GET"); // State to handle HTTP method
  const [queryParams, setQueryParams] = useState([
    { key: "startDate", value: "" },
  ]);
  const [bodyData, setBodyData] = useState(""); // State for request body data (if needed)
  const [fetchResponse, setFetchResponse] = useState(null);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);

  const handleCheckboxChange = (missionId:string) => {
    setSelectedMissions((prevSelected) => {
      if(prevSelected.includes(missionId)) {
        return prevSelected.filter((id) => id !== missionId);
      }else {
        return [...prevSelected, missionId];
      }
    })
  }

  // Update the baseUrl in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("baseUrl", baseUrl);
  }, [baseUrl]);

  const handleAddQueryParam = () => {
    setQueryParams([...queryParams, { key: "", value: "" }]);
  };

  const handleQueryParamChange = (index : number, keyOrValue: string, newValue: string) => {
    const updatedParams = [...queryParams];
    updatedParams[index][keyOrValue] = newValue; // Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ key: string; value: string; }'.
    // No index signature with a parameter of type 'string' was found on type '{ key: string; value: string; }'.ts(7
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
    try {
      const url = buildUrl(); // Use dynamic URL construction
      const requestOptions = {
        method,
        headers: {
          "x-api-key": apiKey, // Include API key for authenticated requests
          "Content-Type": "application/json",
        },
      };
  
      // Include body data if the method is POST or PUT
      if (method === "POST" || method === "PUT") {
        requestOptions.body = JSON.stringify(bodyData); // Property 'body' does not exist on type '{ method: string; headers: { "x-api-key": string; "Content-Type": string; }; }'.
      }
  
      console.log('Final URL:', url);
      console.log('Request Options:', requestOptions);
      
      const response = await fetch(url, requestOptions);
      const data = await response.json();
      console.log('Response Data:', data);
      setFetchResponse(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  

  // Recursive function to render JSON
  const renderJsonTable = (data: unknown) => {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]); // Extract keys of the first object for table headers
  
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
                // <TableRow key={item.id || item.uniqueKey}>
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
  
  // Use renderJsonTable to display the fetched data
  {fetchResponse && (
    <Box>
      <Typography variant="h6">Fetch Response:</Typography>
      {renderJsonTable(fetchResponse)}
    </Box>
  )}
  

  // const handleFetchData = async () => {
  //   try {
  //     const url = `${baseUrl}programs`; // for some reason i had to remove the forward slash between baseUrl and 'programs'  it was logging two slashes here
  //     console.log(url)
  //     const response = await fetch(url);
  //     const data = await response.json();
  //     console.log(data)
  //     setFetchResponse(data);
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //   }
  // };

  // const handleFetchData = async () => {
  //   const functions = getFunctions();
  //   const fetchPrograms = httpsCallable(functions, 'fetchPrograms');

  //   try {
  //     const url = buildUrl();

  //     // Create request options based on the selected method
  //     const requestOptions = {
  //       url,
  //       method, // Pass the selected method
  //       headers: {
  //         'x-api-key': apiKey,
  //         'Content-Type': 'application/json',
  //       },
  //     };

  //     // Include body data if the method is POST or PUT
  //     if (method === 'POST' || method === 'PUT') {
  //       requestOptions.data = JSON.parse(bodyData);
  //     }

  //     // Call Cloud Function with request options
  //     const response = await fetchPrograms(requestOptions);
  //     setFetchResponse(response.data);
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //   }
  // };

  return (
    <Container>
      <Box>
        <Typography variant="h4">Integration Management</Typography>

        {/* Base URL */}
        <TextField
          label="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          fullWidth
          margin="normal"
          helperText="Edit the base URL for the API request."
        />

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
        <TextField
          label="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          fullWidth
          margin="normal"
        />

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
    </Container>
  );
};

export default IntegrationView;
