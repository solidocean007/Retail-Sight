//IntegrationView.tsx
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
import { auth } from "../utils/firebase";
import { getAuth } from "@firebase/auth";

type ExternalApiKey = {
  name: string;
  key: string;
};

const IntegrationView = () => {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [externalApiName, setExternalApiName] = useState("");
  const [storedExternalApiKeys, setStoredExternalApiKeys] = useState<ExternalApiKey[]>([]);
  const [method, setMethod] = useState("GET"); // State to handle HTTP method
  const [queryParams, setQueryParams] = useState([
    // { key: "startDate", value: "" },
    { key: "", value: "" },
  ]);
  const [bodyData, setBodyData] = useState(""); // State for request body data (if needed)
  const [fetchResponse, setFetchResponse] = useState(null);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const functions = getFunctions();

  const handleCheckboxChange = (missionId: string) => {
    setSelectedMissions((prevSelected) => {
      if (prevSelected.includes(missionId)) {
        return prevSelected.filter((id) => id !== missionId);
      } else {
        return [...prevSelected, missionId];
      }
    });
  };

  // Update the baseUrl in localStorage whenever it changes
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

  // the url to the fetchData function is: https://fetchdata-484872165965.us-central1.run.app
  // I dont know if i should call it directly or with the method below using httpsCallable

  // Use Firebase Cloud Function for fetching data
  //  const handleFetchData = async () => {
  //   const functions = getFunctions();
  //   const fetchDataCallable = httpsCallable(functions, 'fetchData');
  //   console.log('fetchDataCallable: ', fetchDataCallable);

  //   try {
  //     const auth = getAuth();
  //     const currentUser = auth.currentUser;

  //     if (currentUser) {
  //       const idToken = await currentUser.getIdToken(); // Get the Firebase auth token

  //       const requestOptions = {
  //         // baseUrl: 'https://jsonplaceholder.typicode.com/todos/1', // Example URL
  //         baseUrl: 'https://httpbin.org/get', // Example URL
  //         method: 'GET',
  //         headers: {
  //           // Authorization: `Bearer ${idToken}`, // Attach Firebase auth token
  //           'Content-Type': 'application/json'
  //         },
  //         queryParams: []
  //       };

  //       console.log('Calling Cloud Function with requestOptions:', requestOptions);
  //       const response = await fetchDataCallable(requestOptions);

  //       console.log('Fetch Data Response:', response.data);
  //     } else {
  //       console.error('User is not authenticated.');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching data:', error);
  //   }
  // };

  const handleFetchData = async () => {
    const requestOptions = {
      baseUrl: baseUrl.trim(), //https://6w7u156vcb.execute-api.us-west-2.amazonaws.com is the base url
      method: method,
      headers: apiKey
        ? { "x-api-key": apiKey, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" }, // Ensure correct headers
      body: method !== "GET" && bodyData ? JSON.parse(bodyData) : null, // Body only for POST/PUT
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

  // Recursive function to render JSON
  // const renderJsonTable = (data: unknown) => {
  //   // Check if the data is an object (single response) or an array
  //   if (Array.isArray(data)) {
  //     const headers = Object.keys(data[0] || {}); // Safeguard against empty array

  //     return (
  //       <TableContainer>
  //         <Table>
  //           <TableHead>
  //             <TableRow>
  //               {headers.map((header) => (
  //                 <TableCell key={header}>{header}</TableCell>
  //               ))}
  //             </TableRow>
  //           </TableHead>
  //           <TableBody>
  //             {data.map((item, index) => (
  //               <TableRow key={index}>
  //                 {headers.map((header) => (
  //                   <TableCell key={header}>{item[header]}</TableCell>
  //                 ))}
  //               </TableRow>
  //             ))}
  //           </TableBody>
  //         </Table>
  //       </TableContainer>
  //     );
  //   } else if (data && typeof data === "object") {
  //     // Render the object as a table
  //     const headers = Object.keys(data);

  //     return (
  //       <TableContainer>
  //         <Table>
  //           <TableHead>
  //             <TableRow>
  //               {headers.map((header) => (
  //                 <TableCell key={header}>{header}</TableCell>
  //               ))}
  //             </TableRow>
  //           </TableHead>
  //           <TableBody>
  //             <TableRow>
  //               {headers.map((header) => (
  //                 <TableCell key={header}>{data[header]}</TableCell>
  //               ))}
  //             </TableRow>
  //           </TableBody>
  //         </Table>
  //       </TableContainer>
  //     );
  //   }

  //   return <span>No data available</span>;
  // };

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

  {
    fetchResponse && (
      <Box>
        <Typography variant="h6">Fetch Response:</Typography>
        {renderJsonTable(fetchResponse)}
      </Box>
    );
  }

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
        <Typography variant="h4">Mission & Integration Management</Typography>
        <Typography variant="h5">
          Requesting information from external sources
        </Typography>
        {/* Base URL */}
        <h5>Select the url for the data you need.</h5>
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

        <h5>Enter the API key you need or select from your stored keys.</h5>
        <Button>Add External Key</Button>
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
